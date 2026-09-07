import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    COMPANY = "COMPANY"


class TransportMode(str, enum.Enum):
    OCEAN = "OCEAN"
    AIR = "AIR"
    ROAD = "ROAD"
    RAIL = "RAIL"


class ShipmentStatus(str, enum.Enum):
    IN_TRANSIT = "IN_TRANSIT"
    DELAYED = "DELAYED"
    AT_PORT = "AT_PORT"
    DELIVERED = "DELIVERED"
    AWAITING_CLEARANCE = "AWAITING_CLEARANCE"


class DataSource(str, enum.Enum):
    LIVE = "LIVE"
    SIMULATED = "SIMULATED"
    DEMO = "DEMO"


class TrackingEventType(str, enum.Enum):
    DEPARTURE = "DEPARTURE"
    IN_TRANSIT = "IN_TRANSIT"
    CHECKPOINT = "CHECKPOINT"
    DISRUPTION = "DISRUPTION"
    ETA_REVISION = "ETA_REVISION"
    ARRIVAL = "ARRIVAL"


class EventSeverity(str, enum.Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class DocumentType(str, enum.Enum):
    BILL_OF_LADING = "BILL_OF_LADING"
    COMMERCIAL_INVOICE = "COMMERCIAL_INVOICE"
    PACKING_LIST = "PACKING_LIST"
    PROOF_OF_DELIVERY = "PROOF_OF_DELIVERY"


class DocumentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    FLAGGED = "FLAGGED"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DisruptionCategory(str, enum.Enum):
    WEATHER = "WEATHER"
    PORT_CONGESTION = "PORT_CONGESTION"
    AIRPORT_DISRUPTION = "AIRPORT_DISRUPTION"
    ROAD_TRAFFIC = "ROAD_TRAFFIC"
    RAIL_DISRUPTION = "RAIL_DISRUPTION"
    GEOPOLITICAL = "GEOPOLITICAL"
    CUSTOMS_DELAY = "CUSTOMS_DELAY"
    LABOR_STRIKE = "LABOR_STRIKE"
    INFRASTRUCTURE = "INFRASTRUCTURE"


class DisruptionSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ExceptionPriority(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AlertType(str, enum.Enum):
    HIGH_RISK = "HIGH_RISK"
    DOCUMENT_ALERT = "DOCUMENT_ALERT"
    DELAY_ALERT = "DELAY_ALERT"
    DISRUPTION_ALERT = "DISRUPTION_ALERT"


class InsightSourceType(str, enum.Enum):
    RISK = "RISK"
    DISRUPTION = "DISRUPTION"
    DOCUMENT = "DOCUMENT"
    DELAY = "DELAY"
    NETWORK = "NETWORK"
