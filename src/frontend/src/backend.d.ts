import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Order {
    id: bigint;
    customerName: string;
    status: DeliveryStatus;
    contactInfo: string;
    customerPrincipal?: Principal;
    description: string;
    address: string;
    quotedPrice?: bigint;
}
export interface Message {
    id: bigint;
    text: string;
    orderId: bigint;
    imageKey?: string;
    timestamp: bigint;
}
export interface UserProfile {
    name: string;
    email: string;
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
    getAllOrders(): Promise<Array<Order>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomerOrders(): Promise<Array<Order>>;
    getOrder(orderId: bigint): Promise<Order | null>;
    getOrderMessages(orderId: bigint): Promise<Array<Message>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    markOrderPaid(orderId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendOrderMessage(orderId: bigint, text: string, imageKey: string | null): Promise<void>;
    setOrderPrice(orderId: bigint, priceInCents: bigint): Promise<void>;
    submitDeliveryRequest(customerName: string, contactInfo: string, address: string, description: string): Promise<bigint>;
}
