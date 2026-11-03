-- Gift ordering / delivery was removed from the product.
-- These drops are safe on a fresh database (IF EXISTS) and clean up older installs.

DROP TABLE IF EXISTS gift_order_events;
DROP TABLE IF EXISTS gift_delivery_addresses;
DROP TABLE IF EXISTS gift_deliveries;
DROP TABLE IF EXISTS gift_orders;
