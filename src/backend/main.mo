import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";
import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Set "mo:core/Set";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Time "mo:core/Time";

actor {
  include MixinStorage();

  // Retained for upgrade compatibility
  let accessControlState = AccessControl.initState();

  // Stripe Config (not persisted across upgrades intentionally)
  var stripeConfig : ?Stripe.StripeConfiguration = null;

  // ─── Stable admin principal ───────────────────────────────────────────────
  stable var _stableAdminPrincipal : ?Principal = null;

  // ─── Types ────────────────────────────────────────────────────────────────
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

  public type DriverProfile = {
    principal : Principal;
    profile : ?UserProfile;
  };

  // ─── Stable backing storage ───────────────────────────────────────────────
  stable var _stableNextOrderId : Nat = 1;
  stable var _stableNextMessageId : Nat = 1;
  stable var _stableNextDriverApplicationId : Nat = 1;
  stable var _stableOrdersArr : [(Nat, Order)] = [];
  stable var _stableUserProfilesArr : [(Principal, UserProfile)] = [];
  stable var _stableOrderMessagesArr : [(Nat, [Message])] = [];
  stable var _stableDriverMessagesArr : [(Nat, [Message])] = [];
  stable var _stableDriversArr : [Principal] = [];
  stable var _stableDriverApplicationsArr : [DriverApplication] = [];
  stable var _stableAdminDriverMessagesArr : [(Principal, [Message])] = [];

  // ─── Mutable working state ────────────────────────────────────────────────
  var nextOrderId = _stableNextOrderId;
  var nextMessageId = _stableNextMessageId;
  var nextDriverApplicationId = _stableNextDriverApplicationId;

  let orders = Map.empty<Nat, Order>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let orderMessages = Map.empty<Nat, List.List<Message>>();
  let driverMessages = Map.empty<Nat, List.List<Message>>();
  let drivers = Set.empty<Principal>();
  let driverApplications = List.empty<DriverApplication>();
  let adminDriverMessages = Map.empty<Principal, List.List<Message>>();

  // ─── Restore state from stable arrays on upgrade ──────────────────────────
  do {
    for ((k, v) in _stableOrdersArr.vals()) { orders.add(k, v) };
    for ((k, v) in _stableUserProfilesArr.vals()) { userProfiles.add(k, v) };
    for ((k, msgs) in _stableOrderMessagesArr.vals()) {
      let list = List.empty<Message>();
      for (m in msgs.vals()) { list.add(m) };
      orderMessages.add(k, list);
    };
    for ((k, msgs) in _stableDriverMessagesArr.vals()) {
      let list = List.empty<Message>();
      for (m in msgs.vals()) { list.add(m) };
      driverMessages.add(k, list);
    };
    for (p in _stableDriversArr.vals()) { drivers.add(p) };
    for (app in _stableDriverApplicationsArr.vals()) { driverApplications.add(app) };
    for ((p, msgs) in _stableAdminDriverMessagesArr.vals()) {
      let list = List.empty<Message>();
      for (m in msgs.vals()) { list.add(m) };
      adminDriverMessages.add(p, list);
    };
  };

  // ─── Upgrade hooks ────────────────────────────────────────────────────────
  system func preupgrade() {
    _stableNextOrderId := nextOrderId;
    _stableNextMessageId := nextMessageId;
    _stableNextDriverApplicationId := nextDriverApplicationId;
    _stableOrdersArr := orders.toArray();
    _stableUserProfilesArr := userProfiles.toArray();
    _stableDriversArr := drivers.toArray();
    _stableDriverApplicationsArr := driverApplications.toArray();

    // Convert Map<Nat, List<Message>> -> [(Nat, [Message])] using explicit loop
    let omBuf = List.empty<(Nat, [Message])>();
    for ((k, list) in orderMessages.toArray().vals()) {
      omBuf.add((k, list.toArray()));
    };
    _stableOrderMessagesArr := omBuf.toArray();

    let dmBuf = List.empty<(Nat, [Message])>();
    for ((k, list) in driverMessages.toArray().vals()) {
      dmBuf.add((k, list.toArray()));
    };
    _stableDriverMessagesArr := dmBuf.toArray();

    let admBuf = List.empty<(Principal, [Message])>();
    for ((p, list) in adminDriverMessages.toArray().vals()) {
      admBuf.add((p, list.toArray()));
    };
    _stableAdminDriverMessagesArr := admBuf.toArray();
  };

  system func postupgrade() {
    nextOrderId := _stableNextOrderId;
    nextMessageId := _stableNextMessageId;
    nextDriverApplicationId := _stableNextDriverApplicationId;
  };

  // ─── Private helper ───────────────────────────────────────────────────────
  func isAdminCaller(caller : Principal) : Bool {
    if (caller.isAnonymous()) { return false };
    switch (_stableAdminPrincipal) {
      case (?p) { Principal.equal(p, caller) };
      case (null) { false };
    };
  };

  // ─── Admin registration ───────────────────────────────────────────────────
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

  // ─── Auth queries ─────────────────────────────────────────────────────────
  public query ({ caller }) func isCallerAdmin() : async Bool {
    isAdminCaller(caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    if (isAdminCaller(caller)) { #admin }
    else if (caller.isAnonymous()) { #guest }
    else { #user };
  };

  public shared ({ caller }) func assignCallerUserRole(_user : Principal, _role : AccessControl.UserRole) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can assign roles");
    };
  };

  // ─── Stripe ───────────────────────────────────────────────────────────────
  public query func isStripeConfigured() : async Bool {
    stripeConfig != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can set Stripe configuration");
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

  // ─── User Profiles ────────────────────────────────────────────────────────
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

  // ─── Orders ───────────────────────────────────────────────────────────────
  public shared ({ caller }) func submitDeliveryRequest(
    customerName : Text,
    contactInfo : Text,
    address : Text,
    description : Text,
  ) : async Nat {
    let orderId = nextOrderId;
    nextOrderId += 1;

    let customerPrincipal = if (caller.isAnonymous()) { null } else { ?caller };

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

  public shared query ({ caller }) func getAllOrders() : async [Order] {
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
        orders.add(orderId, { order with quotedPrice = ?priceInCents; status = #quoted });
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
        orders.add(orderId, { order with status = #paid });
      };
    };
  };

  public shared ({ caller }) func deleteOrder(orderId : Nat) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can delete orders");
    };
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        if (order.status != #completed) {
          Runtime.trap("Can only delete completed orders");
        };
        orders.remove(orderId);
      };
    };
  };

  public query ({ caller }) func getCustomerOrders() : async [Order] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Only authenticated users can view their orders");
    };
    orders.filter(
      func(_id, order) {
        switch (order.customerPrincipal) {
          case (null) { false };
          case (?principal) { Principal.equal(caller, principal) };
        };
      }
    ).values().toArray();
  };

  // ─── Messages ─────────────────────────────────────────────────────────────
  public shared ({ caller }) func sendOrderMessage(orderId : Nat, text : Text, imageKey : ?Text) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can send messages");
    };
    let message : Message = {
      id = nextMessageId;
      orderId;
      text;
      imageKey;
      timestamp = Time.now();
    };
    nextMessageId += 1;
    let list = switch (orderMessages.get(orderId)) {
      case (null) { List.empty<Message>() };
      case (?l) { l };
    };
    list.add(message);
    orderMessages.add(orderId, list);
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
      case (?list) { list.toArray() };
    };
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
      timestamp = Time.now();
    };
    nextMessageId += 1;
    let list = switch (driverMessages.get(orderId)) {
      case (null) { List.empty<Message>() };
      case (?l) { l };
    };
    list.add(message);
    driverMessages.add(orderId, list);
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
      case (?list) { list.toArray() };
    };
  };

  // ─── Admin-Driver messaging ───────────────────────────────────────────────
  public shared ({ caller }) func sendAdminDriverMessage(driverPrincipal : Principal, text : Text) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can send messages");
    };
    appendMessageToThread(driverPrincipal, text);
  };

  public shared ({ caller }) func sendDriverToAdminMessage(text : Text) : async () {
    if (not drivers.contains(caller)) {
      Runtime.trap("Unauthorized: Only drivers can message admins");
    };
    appendMessageToThread(caller, text);
  };

  public shared ({ caller }) func sendUserToAdminMessage(text : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in to send messages");
    };
    appendMessageToThread(caller, text);
  };

  public query ({ caller }) func getMyAdminMessages() : async [Message] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in to view messages");
    };
    switch (adminDriverMessages.get(caller)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    };
  };

  func appendMessageToThread(userPrincipal : Principal, text : Text) {
    let message : Message = {
      id = nextMessageId;
      orderId = 0;
      text;
      imageKey = null;
      timestamp = Time.now();
    };
    nextMessageId += 1;
    let list = switch (adminDriverMessages.get(userPrincipal)) {
      case (null) { List.empty<Message>() };
      case (?l) { l };
    };
    list.add(message);
    adminDriverMessages.add(userPrincipal, list);
  };

  public query ({ caller }) func getAdminDriverMessages(driverPrincipal : Principal) : async [Message] {
    if (not isAdminCaller(caller) and driverPrincipal != caller) {
      Runtime.trap("Unauthorized: Only the driver or an admin can view these messages");
    };
    switch (adminDriverMessages.get(driverPrincipal)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    };
  };

  // ─── Drivers ──────────────────────────────────────────────────────────────
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

  public query ({ caller }) func getAvailableOrders() : async [Order] {
    if (not drivers.contains(caller)) {
      Runtime.trap("Unauthorized: Only drivers can view available orders");
    };
    orders.filter(
      func(_id, order) { order.driverPrincipal == null and order.status == #paid }
    ).values().toArray();
  };

  public query ({ caller }) func getMyDriverOrders() : async [Order] {
    if (not drivers.contains(caller)) {
      Runtime.trap("Unauthorized: Only drivers can view their orders");
    };
    orders.filter(
      func(_id, order) { order.driverPrincipal == ?caller }
    ).values().toArray();
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
        orders.add(orderId, { order with driverPrincipal = ?caller; status = #assigned });
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
        orders.add(orderId, { order with status = #delivering });
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
        orders.add(orderId, { order with status = #completed });
      };
    };
  };

  public query ({ caller }) func getAllDriversWithProfiles() : async [DriverProfile] {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can fetch driver profiles");
    };
    drivers.toArray().map<Principal, DriverProfile>(func(driverPrincipal) {
      { principal = driverPrincipal; profile = userProfiles.get(driverPrincipal) };
    });
  };

  // ─── Driver Applications ──────────────────────────────────────────────────
  public shared ({ caller }) func submitDriverApplication(message : Text) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in to submit driver applications");
    };
    let id = nextDriverApplicationId;
    nextDriverApplicationId += 1;
    driverApplications.add({
      id;
      applicantPrincipal = caller;
      message;
      timestamp = Time.now();
    });
    id;
  };

  public shared ({ caller }) func getDriverApplications() : async [DriverApplication] {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can view all driver applications");
    };
    driverApplications.toArray();
  };

  public shared ({ caller }) func deleteDriverApplication(id : Nat) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can delete driver applications");
    };
    let filtered = driverApplications.filter(func(app : DriverApplication) : Bool { app.id != id });
    driverApplications.clear();
    driverApplications.addAll(filtered.values());
  };
};
