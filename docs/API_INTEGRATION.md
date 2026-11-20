# APEX Electronics — Enterprise API Integration Specification

## 1. Base URL & Security Headers

All API endpoints are hosted under `/api/v1/*`. 

### Request Headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <jwt_access_token>
x-idempotency-key: <optional_unique_client_operation_uuid>
```

### Standard Response Format

All API responses follow the uniform enterprise envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable status summary"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Detailed validation or permission error message",
  "statusCode": 400
}
```

---

## 2. Core Endpoints Catalog

### 2.1 Field Sales Atomic Visit Submission (`POST /api/v1/field-sales/visits/submit`)

Used by Android and Web clients to record a physical retail visit and book orders in a single, idempotent call.

#### Request Headers
- `x-idempotency-key`: String (e.g. `SYNC-OP-1732085400-A7F9`) — **Mandatory for offline sync**.

#### Request Payload Schema
```json
{
  "retailerId": "673d32159187a54911223344",
  "visitDate": "2026-11-20",
  "checkInTime": "2026-11-20T10:15:00.000Z",
  "checkOutTime": "2026-11-20T10:45:00.000Z",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracyMeters": 8.5,
  "googleMapsUrl": "https://maps.google.com/?q=12.9716,77.5946",
  "photos": [
    "https://storage.apex-electronics.app/visits/vst-01-front.jpg",
    "https://storage.apex-electronics.app/visits/vst-01-counter.jpg"
  ],
  "salesLines": [
    {
      "productId": "673d32159187a54911223388",
      "productName": "Samsung Galaxy S24 Ultra 5G 512GB",
      "sku": "SAM-S24U-512-TI",
      "brand": "Samsung",
      "category": "Smartphones",
      "quantity": 3,
      "standardPrice": 129999,
      "unitPrice": 127500,
      "isManualPrice": true
    }
  ],
  "remarks": "Retailer requested 2% promo discount on bulk order",
  "idempotencyKey": "SYNC-OP-1732085400-A7F9"
}
```

#### Response (200 OK / 201 Created)
```json
{
  "success": true,
  "data": {
    "visitId": "VST-20261120-7491",
    "confirmationNumber": "CONF-207491",
    "isDuplicate": false,
    "totalUnits": 3,
    "actualSalesValue": 382500,
    "standardValue": 389997,
    "pendingOverridesCount": 1,
    "status": "COMPLETED",
    "message": "Field sales visit and orders successfully submitted and verified."
  }
}
```

---

### 2.2 Live Dashboard Telemetry (`GET /api/v1/dashboard`)

Retrieves real-time aggregated metrics across retailers, inventory valuation, monthly collections, and order volume.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalRevenue": 48250000,
      "monthlyGrowth": 14.8,
      "activeRetailers": 10,
      "totalOrders": 9,
      "inventoryValue": 128450000,
      "pendingDeliveries": 3,
      "collectionRate": 92.4,
      "overdueReceivables": 1450000
    },
    "turnoverTrajectory": [
      { "month": "Jun", "sales": 3200000, "collections": 2900000 },
      { "month": "Jul", "sales": 3900000, "collections": 3600000 },
      { "month": "Aug", "sales": 4500000, "collections": 4100000 },
      { "month": "Sep", "sales": 5200000, "collections": 4800000 },
      { "month": "Oct", "sales": 5900000, "collections": 5400000 },
      { "month": "Nov", "sales": 6800000, "collections": 6100000 }
    ],
    "brandSplit": [
      { "brand": "Samsung", "percentage": 34, "revenue": 16405000 },
      { "brand": "Apple", "percentage": 28, "revenue": 13510000 },
      { "brand": "Xiaomi", "percentage": 18, "revenue": 8685000 },
      { "brand": "OnePlus", "percentage": 12, "revenue": 5790000 },
      { "brand": "Realme", "percentage": 8, "revenue": 3860000 }
    ]
  }
}
```

---

### 2.3 Catalog Hardware Products (`GET /api/v1/catalog`)

Retrieves authorized mobile phones and consumer electronics with wholesale pricing, category filters, and inventory levels.

#### Query Parameters
- `category`: String (e.g. `Smartphones`, `Wearables`, `Audio`)
- `brand`: String (e.g. `Samsung`, `Apple`, `OnePlus`)
- `search`: String (Search across name, SKU, specifications)
- `inStockOnly`: Boolean (`true` / `false`)

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "673d32159187a54911223388",
        "name": "Samsung Galaxy S24 Ultra 5G",
        "sku": "SAM-S24U-512-TI",
        "brand": "Samsung",
        "category": "Smartphones",
        "standardPrice": 129999,
        "mrp": 139999,
        "stock": 42,
        "specifications": {
          "storage": "512GB",
          "ram": "12GB",
          "color": "Titanium Black",
          "network": "5G Dual SIM"
        },
        "thumbnail": "/products/samsung-s24-ultra.png"
      }
    ],
    "totalCount": 48
  }
}
```

---

### 2.4 Retailer Directory & GPS Registry (`GET /api/v1/retailers`)

Retrieves authorized retail stores, coordinates, credit limits, and outstanding balances.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "retailers": [
      {
        "_id": "673d32159187a54911223344",
        "shopName": "Apex Mobile World — Indiranagar",
        "shopCode": "RET-KA-001",
        "ownerName": "Rajesh Kumar",
        "phone": "+91 98450 12345",
        "gstin": "29AABCA1234F1Z5",
        "address": "100 Feet Road, Indiranagar, Bengaluru, KA 560038",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "creditLimit": 2500000,
        "currentBalance": 450000,
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

### 2.5 Price Override Approval (`PUT /api/v1/distribution/pricing-rules`)

Allows authorized sales managers or administrators to approve or reject manual price discounts requested by field sales reps during store visits.

#### Request Schema
```json
{
  "overrideId": "OVR-20261120-001",
  "decision": "APPROVED",
  "approvedPrice": 127500,
  "managerNotes": "Approved for 3-unit volume tier"
}
```
