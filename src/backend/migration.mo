import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Stripe "stripe/stripe";
import AccessControl "authorization/access-control";
import Text "mo:core/Text";

module {
  public type Restaurant = {
    id : Nat;
    name : Text;
  };

  public type MenuItem = {
    id : Nat;
    name : Text;
  };

  public type Order = {
    id : Nat;
    customer : Principal;
  };

  public type OldUserProfile = {
    name : Text;
  };

  public type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    restaurants : Map.Map<Nat, Restaurant>;
    menuItems : Map.Map<Nat, MenuItem>;
    orders : Map.Map<Nat, Order>;
    userProfiles : Map.Map<Principal, OldUserProfile>;
    stripeConfig : ?Stripe.StripeConfiguration;
  };

  // New types matching the current actor definition
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

  public type NewUserProfile = {
    name : Text;
    email : Text;
  };

  // Conversion functions (old -> new)
  public func convertOldUserProfileToNew(_ : OldUserProfile) : NewUserProfile {
    {
      name = "Unknown";
      email = "Unknown";
    };
  };

  public func convertProfiles(oldProfiles : Map.Map<Principal, OldUserProfile>) : Map.Map<Principal, NewUserProfile> {
    oldProfiles.map<Principal, OldUserProfile, NewUserProfile>(
      func(_principal, oldProfile) {
        convertOldUserProfileToNew(oldProfile);
      }
    );
  };

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    orders : Map.Map<Nat, DeliveryRequest>;
    nextOrderId : Nat;
    stripeConfig : ?Stripe.StripeConfiguration;
    userProfiles : Map.Map<Principal, NewUserProfile>;
  };

  // Complete run method for migration including all changes
  public func run(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      orders = Map.empty<Nat, DeliveryRequest>();
      nextOrderId = 1; // Initialize new field
      userProfiles = convertProfiles(old.userProfiles);
      stripeConfig = old.stripeConfig;
    };
  };
};
