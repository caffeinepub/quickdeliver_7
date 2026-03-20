import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface DriverApplication {
    id: bigint;
    applicantPrincipal: Principal;
    message: string;
    timestamp: bigint;
}
export interface Order {
    id: bigint;
    customerName: string;
    status: DeliveryStatus;
    contactInfo: string;
    customerPrincipal?: Principal;
    description: string;
    address: string;
    quotedPrice?: bigint;
    driverPrincipal?: Principal;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface DriverProfile {
    principal: Principal;
    profile?: UserProfile;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface Message {
    id: bigint;
    text: string;
    orderId: bigint;
    imageKey?: string;
    timestamp: bigint;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface UserProfile {
    name: string;
    email: string;
}
export enum DeliveryStatus {
    assigned = "assigned",
    delivering = "delivering",
    pending = "pending",
    paid = "paid",
    completed = "completed",
    quoted = "quoted"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    claimAdminIfFirst(): Promise<boolean>;
    claimOrder(orderId: bigint): Promise<void>;
    completeOrder(orderId: bigint): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    deleteOrder(orderId: bigint): Promise<void>;
    demoteDriver(principal: Principal): Promise<void>;
    getAdminDriverMessages(driverPrincipal: Principal): Promise<Array<Message>>;
    getAllDrivers(): Promise<Array<Principal>>;
    getAllDriversWithProfiles(): Promise<Array<DriverProfile>>;
    getAllOrders(): Promise<Array<Order>>;
    getAvailableOrders(): Promise<Array<Order>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomerOrders(): Promise<Array<Order>>;
    getDriverApplications(): Promise<Array<DriverApplication>>;
    getDriverMessages(orderId: bigint): Promise<Array<Message>>;
    getMyDriverOrders(): Promise<Array<Order>>;
    getOrder(orderId: bigint): Promise<Order | null>;
    getOrderMessages(orderId: bigint): Promise<Array<Message>>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isCallerDriver(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    markOrderPaid(orderId: bigint): Promise<void>;
    promoteToDriver(principal: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendAdminDriverMessage(driverPrincipal: Principal, text: string): Promise<void>;
    sendDriverMessage(orderId: bigint, text: string, imageKey: string | null): Promise<void>;
    sendDriverToAdminMessage(text: string): Promise<void>;
    sendOrderMessage(orderId: bigint, text: string, imageKey: string | null): Promise<void>;
    setOrderPrice(orderId: bigint, priceInCents: bigint): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    startDelivery(orderId: bigint): Promise<void>;
    submitDeliveryRequest(customerName: string, contactInfo: string, address: string, description: string): Promise<bigint>;
    submitDriverApplication(message: string): Promise<bigint>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
