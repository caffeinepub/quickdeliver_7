import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
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
export interface DeliveryRequest {
    id: bigint;
    customerName: string;
    status: DeliveryStatus;
    contactInfo: string;
    description: string;
    address: string;
    quotedPrice?: bigint;
}
export interface UserProfile {
    name: string;
    email: string;
}
export interface http_header {
    value: string;
    name: string;
}
export enum DeliveryStatus {
    pending = "pending",
    paid = "paid",
    quoted = "quoted"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    getAllOrders(): Promise<Array<DeliveryRequest>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getOrder(orderId: bigint): Promise<DeliveryRequest | null>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    markOrderPaid(orderId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setOrderPrice(orderId: bigint, priceInCents: bigint): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    submitDeliveryRequest(customerName: string, contactInfo: string, address: string, description: string): Promise<bigint>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
