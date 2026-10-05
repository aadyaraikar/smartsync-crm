import type { Customer } from "./types";

export const seedCustomers: Customer[] = [
  {
    id: "cus_1048",
    name: "Maya Chen",
    email: "maya.chen@example.com",
    ltv: 1240,
    totalOrders: 8,
    lastOrderDate: "Today, 09:42",
    status: "VIP",
  },
  {
    id: "cus_1047",
    name: "Jon Bell",
    email: "jon.bell@example.com",
    ltv: 680,
    totalOrders: 4,
    lastOrderDate: "Yesterday",
    status: "VIP",
  },
  {
    id: "cus_1046",
    name: "Sofia Alvarez",
    email: "sofia.alvarez@example.com",
    ltv: 245,
    totalOrders: 2,
    lastOrderDate: "Sep 28, 2026",
    status: "Standard",
  },
  {
    id: "cus_1045",
    name: "Theo Wright",
    email: "theo.wright@example.com",
    ltv: 420,
    totalOrders: 3,
    lastOrderDate: "Jun 18, 2026",
    status: "At-Risk",
  },
  {
    id: "cus_1044",
    name: "Priya Shah",
    email: "priya.shah@example.com",
    ltv: 95,
    totalOrders: 1,
    lastOrderDate: "Sep 22, 2026",
    status: "New",
  },
];
