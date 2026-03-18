import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import OutCall "http-outcalls/outcall";
import Stripe "stripe/stripe";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Migration "migration";

(with migration = Migration.run)
actor {
  // Types
  public type DeliveryStatus = {
    #pending;
    #quoted;
    #paid;
  };

  public type DeliveryRequest = {
    id : Nat;
    customerName : Text;
    contactInfo : Text;
    address : Text;
    description : Text;
    quotedPrice : ?Nat;
    status : DeliveryStatus;
  };

  public type UserProfile = {
    name : Text;
    email : Text;
  };

  // State
  var nextOrderId = 1;
  let orders = Map.empty<Nat, DeliveryRequest>();
  var stripeConfig : ?Stripe.StripeConfiguration = null;
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Component-based Access Control
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Management
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

  // Order Management
  public shared ({ caller }) func submitDeliveryRequest(customerName : Text, contactInfo : Text, address : Text, description : Text) : async Nat {
    let orderId = nextOrderId;
    nextOrderId += 1;

    let newRequest : DeliveryRequest = {
      id = orderId;
      customerName;
      contactInfo;
      address;
      description;
      quotedPrice = null;
      status = #pending;
    };

    orders.add(orderId, newRequest);
    orderId;
  };

  public query ({ caller }) func getOrder(orderId : Nat) : async ?DeliveryRequest {
    // No authentication required - anyone can look up an order by ID
    orders.get(orderId);
  };

  // Admin-only functions
  public shared ({ caller }) func getAllOrders() : async [DeliveryRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can fetch all orders");
    };
    orders.values().toArray();
  };

  public shared ({ caller }) func setOrderPrice(orderId : Nat, priceInCents : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set prices");
    };

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder = {
          order with
          quotedPrice = ?priceInCents;
          status = #quoted;
        };
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
        let updatedOrder = {
          order with
          status = #paid;
        };
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

  // Stripe Integration
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
      Runtime.trap("Unauthorized: Only authenticated users can check session status");
    };

    switch (stripeConfig) {
      case (null) {
        Runtime.trap("Stripe is not configured! Contact the admin.");
      };
      case (?config) {
        await Stripe.getSessionStatus(config, sessionId, transform);
      };
    };
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
