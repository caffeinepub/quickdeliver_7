import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";



actor {
  include MixinStorage();

  public type DeliveryStatus = { #pending; #quoted; #paid };
  public type Order = {
      id : Nat;
      customerName : Text;
      contactInfo : Text;
      address : Text;
      description : Text;
      quotedPrice : ?Nat;
      status : DeliveryStatus;
      customerPrincipal : ?Principal;
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

  var nextOrderId = 1;
  var nextMessageId = 1;

  let orders = Map.empty<Nat, Order>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let orderMessages = Map.empty<Nat, List.List<Message>>();
  var stripeConfig : ?Stripe.StripeConfiguration = null;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func submitDeliveryRequest(customerName : Text, contactInfo : Text, address : Text, description : Text) : async Nat {
    let orderId = nextOrderId;
    nextOrderId += 1;

    let customerPrincipal = if (caller.isAnonymous()) {
      null
    } else {
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

        if (AccessControl.isAdmin(accessControlState, caller) or isOwner) {
          ?order;
        } else {
          Runtime.trap("Unauthorized: Can only view your own orders");
        };
      };
    };
  };

  public shared ({ caller }) func getAllOrders() : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can fetch all orders");
    };
    orders.toArray().map(func((_, order)) { order });
  };

  public shared ({ caller }) func setOrderPrice(orderId : Nat, priceInCents : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
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

  public query func isStripeConfigured() : async Bool {
    stripeConfig != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set Stripe configuration");
    };
    stripeConfig := ?config;
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create checkout sessions");
    };

    switch (stripeConfig) {
      case (null) {
        Runtime.trap("Stripe is not configured! Contact the admin.");
      };
      case (?config) {
        await Stripe.createCheckoutSession(config, caller, items, successUrl, cancelUrl, transform);
      };
    };
  };

  public shared ({ caller }) func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can start a session");
    };

    switch (stripeConfig) {
      case (null) {
        Runtime.trap("Stripe needs to be first configured! Contact the admin.");
      };
      case (?config) {
        await Stripe.getSessionStatus(config, sessionId, transform);
      };
    };
  };

  public shared ({ caller }) func sendOrderMessage(orderId : Nat, text : Text, imageKey : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
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

        if (not (AccessControl.isAdmin(accessControlState, caller) or isOwner)) {
          Runtime.trap("Unauthorized: Can only view messages for your own orders");
        };
      };
    };

    switch (orderMessages.get(orderId)) {
      case (null) { [] };
      case (?messages) { messages.toArray() };
    };
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public query ({ caller }) func getCustomerOrders() : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
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

};
