module {
  public func run(state : { var nextOrderId : Nat }) : { nextOrderId : Nat } {
    { nextOrderId = state.nextOrderId };
  };
};
