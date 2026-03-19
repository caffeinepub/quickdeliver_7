import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";
import Map "mo:core/Map";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import MixinStorage "blob-storage/Mixin";

actor {
  include MixinStorage();

  // Prefabricated AccessSystem instance
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Persistent Stripe configuration
  var stripeConfig : ?Stripe.StripeConfiguration = null;

  // Stable admin principal -- persists across deployments/upgrades.
  var _stableAdminPrincipal : ?Principal = null;

  public type DeliveryStatus = {
    #pending;
    #quoted;
    #paid;
    #assigned;
    #delivering;
    #completed;
  };
  public type Order = {
    id : Nat;
    customerName : Text;
    contactInfo : Text;
    address : Text;
    description : Text;
    quotedPrice : ?Nat;
    status : DeliveryStatus;
    customerPrincipal : ?Principal;
    driverPrincipal : ?Principal;
  };

  public type UserProfile = {
    name : Text;
    email : Text;
  };

  public type Message = {
    id : Nat;
    orderId : Nat;
    text : Text;
    imageKey : ?Text;
    timestamp : Int;
  };

  public type DriverApplication = {
    id : Nat;
    applicantPrincipal : Principal;
    message : Text;
    timestamp : Int;
  };

  var nextOrderId = 1;
  var nextMessageId = 1;
  var nextDriverApplicationId = 1;

  let orders = Map.empty<Nat, Order>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let orderMessages = Map.empty<Nat, List.List<Message>>();
  let driverMessages = Map.empty<Nat, List.List<Message>>();
  let drivers = Set.empty<Principal>();
  let driverApplications = List.empty<DriverApplication>();

  // Stripe integration methods
  public query func isStripeConfigured() : async Bool {
    stripeConfig != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can set Stripe configuration (" # debug_show (caller) # ")");
    };
    stripeConfig := ?config;
  };

  public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    switch (stripeConfig) {
      case (null) { Runtime.trap("Stripe not configured") };
      case (?config) {
        await Stripe.getSessionStatus(config, sessionId, transform);
      };
    };
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    switch (stripeConfig) {
      case (null) { Runtime.trap("Stripe not configured") };
      case (?config) {
        await Stripe.createCheckoutSession(config, caller, items, successUrl, cancelUrl, transform);
      };
    };
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  func isAdminCaller(caller : Principal) : Bool {
    if (caller.isAnonymous()) { return false };
    // Check stable storage first (survives upgrades)
    switch (_stableAdminPrincipal) {
      case (?p) { if (Principal.equal(p, caller)) { return true } };
      case (null) {};
    };
    // Fallback to ACL (works within same deployment session)
    AccessControl.isAdmin(accessControlState, caller);
  };

  public shared ({ caller }) func claimAdminIfFirst() : async Bool {
    if (_stableAdminPrincipal == null) {
      _stableAdminPrincipal := ?caller;
      return true;
    } else if (?caller == _stableAdminPrincipal) {
      return true;
    } else {
      return false;
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in to view profile");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not Principal.equal(caller, user) and not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in to save profile");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func submitDeliveryRequest(
    customerName : Text,
    contactInfo : Text,
    address : Text,
    description : Text
  ) : async Nat {
    let orderId = nextOrderId;
    nextOrderId += 1;

    let customerPrincipal = if (caller.isAnonymous()) { null } else {
      ?caller;
    };

    let newOrder : Order = {
      id = orderId;
      customerName;
      contactInfo;
      address;
      description;
      quotedPrice = null;
      status = #pending;
      customerPrincipal;
      driverPrincipal = null;
    };

    orders.add(orderId, newOrder);
    orderId;
  };

  public query ({ caller }) func getOrder(orderId : Nat) : async ?Order {
    switch (orders.get(orderId)) {
      case (null) { null };
      case (?order) {
        let isOwner = switch (order.customerPrincipal) {
          case (null) { false };
          case (?principal) { Principal.equal(caller, principal) };
        };

        let isAssignedDriver = switch (order.driverPrincipal) {
          case (null) { false };
          case (?driver) { Principal.equal(caller, driver) };
        };

        if (isAdminCaller(caller) or isOwner or isAssignedDriver) {
          ?order;
        } else {
          Runtime.trap("Unauthorized: Can only view your own orders or orders assigned to you");
        };
      };
    };
  };

  public shared ({ caller }) func getAllOrders() : async [Order] {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can fetch all orders");
    };
    orders.toArray().map(func((_, order)) { order });
  };

  public shared ({ caller }) func setOrderPrice(orderId : Nat, priceInCents : Nat) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can set prices");
    };

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder = { order with quotedPrice = ?priceInCents; status = #quoted };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func markOrderPaid(orderId : Nat) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can mark as paid");
    };

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder = { order with status = #paid };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func sendOrderMessage(orderId : Nat, text : Text, imageKey : ?Text) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can send messages");
    };

    let message : Message = {
      id = nextMessageId;
      orderId;
      text;
      imageKey;
      timestamp = 0;
    };

    nextMessageId += 1;

    let existingMessages = switch (orderMessages.get(orderId)) {
      case (null) { List.empty<Message>() };
      case (?messages) { messages };
    };

    existingMessages.add(message);
    orderMessages.add(orderId, existingMessages);
  };

  public query ({ caller }) func getOrderMessages(orderId : Nat) : async [Message] {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let isOwner = switch (order.customerPrincipal) {
          case (null) { false };
          case (?principal) { Principal.equal(caller, principal) };
        };

        if (not (isAdminCaller(caller) or isOwner)) {
          Runtime.trap("Unauthorized: Can only view messages for your own orders");
        };
      };
    };

    switch (orderMessages.get(orderId)) {
      case (null) { [] };
      case (?messages) { messages.toArray() };
    };
  };

  public query ({ caller }) func getCustomerOrders() : async [Order] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Only authenticated users can view their orders");
    };

    let filteredOrders = orders.filter(
      func(_id, order) {
        switch (order.customerPrincipal) {
          case (null) { false };
          case (?principal) { Principal.equal(caller, principal) };
        };
      }
    );

    filteredOrders.values().toArray();
  };

  public shared ({ caller }) func promoteToDriver(principal : Principal) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can promote drivers");
    };
    drivers.add(principal);
  };

  public shared ({ caller }) func demoteDriver(principal : Principal) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can demote a driver");
    };

    drivers.remove(principal);
  };

  public query ({ caller }) func isCallerDriver() : async Bool {
    drivers.contains(caller);
  };

  public query ({ caller }) func getAllDrivers() : async [Principal] {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can view all drivers");
    };
    drivers.toArray();
  };

  public shared ({ caller }) func claimOrder(orderId : Nat) : async () {
    if (not drivers.contains(caller)) {
      Runtime.trap("Unauthorized: Only drivers can claim orders");
    };

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        if (order.driverPrincipal != null or order.status != #paid) {
          Runtime.trap("Order must be paid and unclaimed");
        };

        let updatedOrder = { order with driverPrincipal = ?caller; status = #assigned };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func startDelivery(orderId : Nat) : async () {
    if (not drivers.contains(caller)) {
      Runtime.trap("Unauthorized: Only drivers can start delivery");
    };

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        if (order.driverPrincipal != ?caller) {
          Runtime.trap("You must be the assigned driver");
        };

        if (order.status != #assigned) {
          Runtime.trap("Order must be in assigned status to start delivery");
        };

        let updatedOrder = { order with status = #delivering };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func completeOrder(orderId : Nat) : async () {
    if (not drivers.contains(caller)) {
      Runtime.trap("Unauthorized: Only drivers can complete orders");
    };

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        if (order.driverPrincipal != ?caller) {
          Runtime.trap("You must be the assigned driver");
        };

        if (order.status != #delivering) {
          Runtime.trap("Can only complete deliveries in progress");
        };

        let updatedOrder = { order with status = #completed };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public query ({ caller }) func getAvailableOrders() : async [Order] {
    if (not drivers.contains(caller)) {
      Runtime.trap("Unauthorized: Only drivers can view available orders");
    };

    let filteredOrders = orders.filter(
      func(_id, order) {
        order.driverPrincipal == null and order.status == #paid
      }
    );

    filteredOrders.values().toArray();
  };

  public query ({ caller }) func getMyDriverOrders() : async [Order] {
    if (not drivers.contains(caller)) {
      Runtime.trap("Unauthorized: Only drivers can view their orders");
    };

    let filteredOrders = orders.filter(
      func(_id, order) {
        order.driverPrincipal == ?caller
      }
    );

    filteredOrders.values().toArray();
  };

  public shared ({ caller }) func sendDriverMessage(orderId : Nat, text : Text, imageKey : ?Text) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let isDriver = switch (order.driverPrincipal) {
          case (?driver) { driver == caller };
          case (null) { false };
        };

        let isCustomer = switch (order.customerPrincipal) {
          case (?customer) { customer == caller };
          case (null) { false };
        };

        if (not isDriver and not isCustomer) {
          Runtime.trap("Unauthorized: Only assigned driver or customer can send messages");
        };
      };
    };

    let message : Message = {
      id = nextMessageId;
      orderId;
      text;
      imageKey;
      timestamp = 0;
    };

    nextMessageId += 1;

    let existingMessages = switch (driverMessages.get(orderId)) {
      case (null) { List.empty<Message>() };
      case (?messages) { messages };
    };

    existingMessages.add(message);
    driverMessages.add(orderId, existingMessages);
  };

  public query ({ caller }) func getDriverMessages(orderId : Nat) : async [Message] {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let isDriver = switch (order.driverPrincipal) {
          case (?driver) { driver == caller };
          case (null) { false };
        };

        let isCustomer = switch (order.customerPrincipal) {
          case (?customer) { customer == caller };
          case (null) { false };
        };

        if (not isAdminCaller(caller) and not isDriver and not isCustomer) {
          Runtime.trap("Unauthorized: Only assigned driver, customer, or admin can view messages");
        };
      };
    };

    switch (driverMessages.get(orderId)) {
      case (null) { [] };
      case (?messages) { messages.toArray() };
    };
  };

  // Driver application methods
  public shared ({ caller }) func submitDriverApplication(message : Text) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in to submit driver applications");
    };

    let id = nextDriverApplicationId;
    nextDriverApplicationId += 1;

    let application : DriverApplication = {
      id;
      applicantPrincipal = caller;
      message;
      timestamp = 0;
    };

    driverApplications.add(application);
    id;
  };

  public shared ({ caller }) func getDriverApplications() : async [DriverApplication] {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can view all driver applications");
    };
    driverApplications.toArray();
  };
};
