from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database.session import engine, SessionLocal, Base
from app.models.enums import (
    TransportMode, ShipmentStatus, DataSource, TrackingEventType,
    EventSeverity, DocumentType, DocumentStatus, RiskLevel,
    DisruptionCategory, DisruptionSeverity, ExceptionPriority, AlertType, UserRole
)
from app.models.user import User
from app.models.shipment import Shipment
from app.models.tracking import TrackingEvent
from app.models.location import Location, LocationType
from app.models.document import Document, DocumentExtraction, DocumentDiscrepancy
from app.models.disruption import ExternalDisruption, ShipmentDisruptionLink
from app.models.exception import ShipmentException
from app.models.recommendation import Recommendation
from app.models.alert import Alert
from app.models.ai import AIInsight, InsightSourceType
import hashlib
import json


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def seed_data():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        _seed_users(db)
        _seed_locations(db)
        _seed_disruptions(db)
        _seed_shipments(db)
        _seed_tracking_events(db)
        _seed_documents(db)
        _seed_alerts(db)
        _seed_insights(db)
        db.commit()
        print("Seed data loaded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        db.close()


def _seed_users(db: Session):
    users = [
        User(
            email="admin@nexus.ai",
            name="NEXUS Admin",
            hashed_password=hash_password("admin123"),
            role=UserRole.ADMIN,
            company_name=None
        ),
        User(
            email="maersk@nexus.ai",
            name="Maersk Operations",
            hashed_password=hash_password("maersk123"),
            role=UserRole.COMPANY,
            company_name="Maersk Line"
        ),
        User(
            email="emirates@nexus.ai",
            name="Emirates Logistics",
            hashed_password=hash_password("emirates123"),
            role=UserRole.COMPANY,
            company_name="Emirates SkyCargo"
        ),
        User(
            email="hapag@nexus.ai",
            name="Hapag-Lloyd Desk",
            hashed_password=hash_password("hapag123"),
            role=UserRole.COMPANY,
            company_name="Hapag-Lloyd"
        ),
        User(
            email="pkrail@nexus.ai",
            name="Pakistan Railways",
            hashed_password=hash_password("rail123"),
            role=UserRole.COMPANY,
            company_name="Pakistan Railways"
        ),
    ]
    db.add_all(users)
    db.flush()


def _seed_locations(db: Session):
    locations = [
        Location(name="Shanghai Port", lat=31.2304, lng=121.4737, location_type=LocationType.PORT, is_hub=True),
        Location(name="Rotterdam Port", lat=51.9225, lng=4.4792, location_type=LocationType.PORT, is_hub=True),
        Location(name="Singapore Port", lat=1.3521, lng=103.8198, location_type=LocationType.PORT, is_hub=True),
        Location(name="Hamburg Port", lat=53.5511, lng=9.9937, location_type=LocationType.PORT, is_hub=True),
        Location(name="Dubai Airport", lat=25.2048, lng=55.2708, location_type=LocationType.AIRPORT, is_hub=True),
        Location(name="London Airport", lat=51.5074, lng=-0.1278, location_type=LocationType.AIRPORT, is_hub=True),
        Location(name="Hong Kong Airport", lat=22.3193, lng=114.1694, location_type=LocationType.AIRPORT, is_hub=True),
        Location(name="Frankfurt Airport", lat=50.1109, lng=8.6821, location_type=LocationType.AIRPORT, is_hub=True),
        Location(name="Lahore Checkpoint", lat=31.5204, lng=74.3587, location_type=LocationType.ROAD_CHECKPOINT, is_hub=True),
        Location(name="Islamabad Checkpoint", lat=33.6844, lng=73.0479, location_type=LocationType.ROAD_CHECKPOINT, is_hub=True),
        Location(name="Karachi Station", lat=24.8607, lng=67.0011, location_type=LocationType.RAIL_STATION, is_hub=True),
        Location(name="Lahore Station", lat=31.5204, lng=74.3587, location_type=LocationType.RAIL_STATION, is_hub=True),
        Location(name="Peshawar Station", lat=34.0151, lng=71.5249, location_type=LocationType.RAIL_STATION, is_hub=True),
        Location(name="Multan Checkpoint", lat=30.1575, lng=71.5249, location_type=LocationType.ROAD_CHECKPOINT, is_hub=True),
    ]
    db.add_all(locations)
    db.flush()


def _seed_disruptions(db: Session):
    rotterdam_congestion = ExternalDisruption(
        category=DisruptionCategory.PORT_CONGESTION,
        location_name="Rotterdam Port",
        lat=51.9225,
        lng=4.4792,
        severity=DisruptionSeverity.HIGH,
        potential_impact_hours_min=12,
        potential_impact_hours_max=24,
        description="Severe port congestion due to increased vessel arrivals and labor shortages. Expect significant delays for all berthing operations.",
        active=True
    )
    dubai_weather = ExternalDisruption(
        category=DisruptionCategory.WEATHER,
        location_name="Dubai",
        lat=25.2048,
        lng=55.2708,
        severity=DisruptionSeverity.MEDIUM,
        potential_impact_hours_min=6,
        potential_impact_hours_max=12,
        description="Sandstorm warning affecting flight operations at Dubai International Airport.",
        active=True
    )
    db.add_all([rotterdam_congestion, dubai_weather])
    db.flush()


def _seed_shipments(db: Session):
    now = datetime.utcnow()
    shipments = [
        Shipment(
            shipment_ref="NX-1042",
            container_number="CSLU2123456",
            booking_number="BK-88712",
            bol_number="BOL-44521",
            transport_mode=TransportMode.OCEAN,
            carrier="Maersk Line",
            company_name="Maersk Line",
            cargo_description="Electronics components",
            cargo_weight_kg=5000.0,
            cargo_value_usd=125000.0,
            origin_name="Shanghai",
            origin_lat=31.2304,
            origin_lng=121.4737,
            destination_name="Rotterdam",
            destination_lat=51.9225,
            destination_lng=4.4792,
            route_waypoints=[[31.23, 121.47], [25.0, 118.0], [18.0, 108.0], [10.0, 80.0], [5.0, 60.0], [10.0, 45.0], [20.0, 38.0], [30.0, 32.0], [36.0, 5.0], [43.0, 2.0], [51.92, 4.48]],
            status=ShipmentStatus.IN_TRANSIT,
            original_eta=now - timedelta(days=2),
            current_eta=now + timedelta(hours=21),
            data_source=DataSource.SIMULATED,
        ),
        Shipment(
            shipment_ref="NX-1073",
            container_number="MSKU7987654",
            booking_number="BK-88713",
            bol_number="BOL-44522",
            transport_mode=TransportMode.OCEAN,
            carrier="Maersk Line",
            company_name="Maersk Line",
            cargo_description="Automotive parts",
            cargo_weight_kg=8200.0,
            cargo_value_usd=210000.0,
            origin_name="Shanghai",
            origin_lat=31.2304,
            origin_lng=121.4737,
            destination_name="Rotterdam",
            destination_lat=51.9225,
            destination_lng=4.4792,
            route_waypoints=[[31.23, 121.47], [22.0, 115.0], [15.0, 100.0], [8.0, 75.0], [5.0, 55.0], [12.0, 42.0], [22.0, 36.0], [32.0, 30.0], [38.0, 5.0], [45.0, 3.0], [51.92, 4.48]],
            status=ShipmentStatus.IN_TRANSIT,
            original_eta=now - timedelta(days=1),
            current_eta=now + timedelta(hours=18),
            data_source=DataSource.SIMULATED,
        ),
        Shipment(
            shipment_ref="NX-1087",
            awb_number="AWB-66789",
            booking_number="BK-99123",
            transport_mode=TransportMode.AIR,
            carrier="Emirates SkyCargo",
            company_name="Emirates SkyCargo",
            cargo_description="Pharmaceutical supplies",
            cargo_weight_kg=1200.0,
            cargo_value_usd=450000.0,
            origin_name="Dubai",
            origin_lat=25.2048,
            origin_lng=55.2708,
            destination_name="London",
            destination_lat=51.5074,
            destination_lng=-0.1278,
            route_waypoints=[[25.20, 55.27], [28.0, 48.0], [32.0, 40.0], [38.0, 30.0], [42.0, 20.0], [46.0, 10.0], [50.0, 0.0], [51.51, -0.13]],
            status=ShipmentStatus.DELAYED,
            original_eta=now - timedelta(hours=12),
            current_eta=now + timedelta(hours=6),
            data_source=DataSource.SIMULATED,
        ),
        Shipment(
            shipment_ref="NX-1091",
            container_number="NOR-55432",
            booking_number="BK-77456",
            transport_mode=TransportMode.ROAD,
            carrier="Guru Road Logistics",
            company_name="Guru Road Logistics",
            cargo_description="Textile goods",
            cargo_weight_kg=3500.0,
            cargo_value_usd=85000.0,
            origin_name="Lahore",
            origin_lat=31.5204,
            origin_lng=74.3587,
            destination_name="Islamabad",
            destination_lat=33.6844,
            destination_lng=73.0479,
            route_waypoints=[[31.52, 74.36], [32.0, 74.1], [32.5, 73.8], [33.0, 73.5], [33.68, 73.05]],
            status=ShipmentStatus.IN_TRANSIT,
            original_eta=now + timedelta(hours=8),
            current_eta=now + timedelta(hours=10),
            data_source=DataSource.SIMULATED,
        ),
        Shipment(
            shipment_ref="NX-1105",
            train_number="TRN-2234",
            booking_number="BK-55678",
            transport_mode=TransportMode.RAIL,
            carrier="Pakistan Railways",
            company_name="Pakistan Railways",
            cargo_description="Industrial machinery",
            cargo_weight_kg=15000.0,
            cargo_value_usd=320000.0,
            origin_name="Karachi",
            origin_lat=24.8607,
            origin_lng=67.0011,
            destination_name="Lahore",
            destination_lat=31.5204,
            destination_lng=74.3587,
            route_waypoints=[[24.86, 67.00], [26.5, 67.5], [28.0, 68.0], [29.5, 70.0], [31.0, 72.0], [31.52, 74.36]],
            status=ShipmentStatus.IN_TRANSIT,
            original_eta=now + timedelta(hours=16),
            current_eta=now + timedelta(hours=16),
            data_source=DataSource.SIMULATED,
        ),
        Shipment(
            shipment_ref="NX-1112",
            container_number="HLCU3345678",
            booking_number="BK-66789",
            bol_number="BOL-55678",
            transport_mode=TransportMode.OCEAN,
            carrier="Hapag-Lloyd",
            company_name="Hapag-Lloyd",
            cargo_description="Consumer electronics",
            cargo_weight_kg=6800.0,
            cargo_value_usd=190000.0,
            origin_name="Singapore",
            origin_lat=1.3521,
            origin_lng=103.8198,
            destination_name="Hamburg",
            destination_lat=53.5511,
            destination_lng=9.9937,
            route_waypoints=[[1.35, 103.82], [5.0, 95.0], [10.0, 80.0], [15.0, 65.0], [20.0, 55.0], [25.0, 45.0], [30.0, 35.0], [35.0, 25.0], [40.0, 18.0], [45.0, 12.0], [50.0, 8.0], [53.55, 9.99]],
            status=ShipmentStatus.AT_PORT,
            original_eta=now - timedelta(days=3),
            current_eta=now - timedelta(days=1),
            data_source=DataSource.SIMULATED,
        ),
        Shipment(
            shipment_ref="NX-1120",
            awb_number="AWB-77890",
            booking_number="BK-88901",
            transport_mode=TransportMode.AIR,
            carrier="Cathay Pacific Cargo",
            company_name="Cathay Pacific Cargo",
            cargo_description="Medical equipment",
            cargo_weight_kg=950.0,
            cargo_value_usd=680000.0,
            origin_name="Hong Kong",
            origin_lat=22.3193,
            origin_lng=114.1694,
            destination_name="Frankfurt",
            destination_lat=50.1109,
            destination_lng=8.6821,
            route_waypoints=[[22.32, 114.17], [25.0, 105.0], [30.0, 90.0], [35.0, 75.0], [40.0, 60.0], [45.0, 45.0], [50.11, 8.68]],
            status=ShipmentStatus.DELIVERED,
            original_eta=now - timedelta(days=2),
            current_eta=now - timedelta(days=2),
            data_source=DataSource.SIMULATED,
        ),
        Shipment(
            shipment_ref="NX-1134",
            container_number="TRK-88765",
            booking_number="BK-44567",
            transport_mode=TransportMode.ROAD,
            carrier="Pakistan Cargo Services",
            company_name="Pakistan Cargo Services",
            cargo_description="Agricultural products",
            cargo_weight_kg=4200.0,
            cargo_value_usd=65000.0,
            origin_name="Karachi",
            origin_lat=24.8607,
            origin_lng=67.0011,
            destination_name="Multan",
            destination_lat=30.1575,
            destination_lng=71.5249,
            route_waypoints=[[24.86, 67.00], [26.0, 67.5], [27.5, 68.5], [29.0, 69.5], [30.16, 71.52]],
            status=ShipmentStatus.AWAITING_CLEARANCE,
            original_eta=now - timedelta(hours=6),
            current_eta=now + timedelta(hours=4),
            data_source=DataSource.SIMULATED,
        ),
        Shipment(
            shipment_ref="NX-1140",
            train_number="TRN-3345",
            booking_number="BK-33456",
            transport_mode=TransportMode.RAIL,
            carrier="Pakistan Railways",
            company_name="Pakistan Railways",
            cargo_description="Cement and construction materials",
            cargo_weight_kg=22000.0,
            cargo_value_usd=95000.0,
            origin_name="Lahore",
            origin_lat=31.5204,
            origin_lng=74.3587,
            destination_name="Peshawar",
            destination_lat=34.0151,
            destination_lng=71.5249,
            route_waypoints=[[31.52, 74.36], [32.0, 73.5], [32.5, 72.8], [33.0, 72.2], [33.5, 71.8], [34.02, 71.52]],
            status=ShipmentStatus.IN_TRANSIT,
            original_eta=now + timedelta(hours=12),
            current_eta=now + timedelta(hours=12),
            data_source=DataSource.SIMULATED,
        ),
        Shipment(
            shipment_ref="NX-1150",
            container_number="EILU4456789",
            booking_number="BK-22345",
            bol_number="BOL-66789",
            transport_mode=TransportMode.OCEAN,
            carrier="Evergreen Marine",
            company_name="Evergreen Marine",
            cargo_description="Textile raw materials",
            cargo_weight_kg=7500.0,
            cargo_value_usd=145000.0,
            origin_name="Shanghai",
            origin_lat=31.2304,
            origin_lng=121.4737,
            destination_name="Rotterdam",
            destination_lat=51.9225,
            destination_lng=4.4792,
            route_waypoints=[[31.23, 121.47], [24.0, 117.0], [17.0, 105.0], [9.0, 78.0], [4.0, 58.0], [11.0, 44.0], [21.0, 37.0], [31.0, 31.0], [37.0, 5.0], [44.0, 3.0], [51.92, 4.48]],
            status=ShipmentStatus.IN_TRANSIT,
            original_eta=now - timedelta(days=1),
            current_eta=now + timedelta(hours=20),
            data_source=DataSource.SIMULATED,
        ),
    ]
    db.add_all(shipments)
    db.flush()

    rotterdam = db.query(ExternalDisruption).filter(
        ExternalDisruption.location_name == "Rotterdam Port"
    ).first()
    dubai = db.query(ExternalDisruption).filter(
        ExternalDisruption.location_name == "Dubai"
    ).first()

    ocean_shipments = db.query(Shipment).filter(
        Shipment.transport_mode == TransportMode.OCEAN
    ).all()
    for s in ocean_shipments:
        if s.destination_name == "Rotterdam" or (s.route_waypoints and any(
            abs(wp[0] - 51.92) < 5 and abs(wp[1] - 4.48) < 5 for wp in s.route_waypoints
        )):
            link = ShipmentDisruptionLink(shipment_id=s.id, disruption_id=rotterdam.id)
            db.add(link)

    dubai_shipment = db.query(Shipment).filter(Shipment.shipment_ref == "NX-1087").first()
    if dubai_shipment:
        link = ShipmentDisruptionLink(shipment_id=dubai_shipment.id, disruption_id=dubai.id)
        db.add(link)
    db.flush()


def _seed_tracking_events(db: Session):
    now = datetime.utcnow()
    shipments = db.query(Shipment).all()
    for s in shipments:
        waypoints = s.route_waypoints or []
        num_events = min(len(waypoints), 6)
        if num_events < 2:
            continue

        event_times = []
        time_span = (s.current_eta - s.original_eta).total_seconds() if s.original_eta and s.current_eta else 3600 * 24
        if time_span <= 0:
            time_span = 3600 * 24

        for i in range(num_events):
            t = s.original_eta + timedelta(seconds=time_span * i / (num_events - 1))
            event_times.append(t)

        for i, wp in enumerate(waypoints[:num_events]):
            if i == 0:
                event_type = TrackingEventType.DEPARTURE
                severity = EventSeverity.NORMAL
                desc = f"Departed from {s.origin_name}"
            elif i == num_events - 1:
                if s.status == ShipmentStatus.DELIVERED:
                    event_type = TrackingEventType.ARRIVAL
                    desc = f"Arrived at {s.destination_name}"
                else:
                    event_type = TrackingEventType.IN_TRANSIT
                    desc = f"Currently near waypoint {i}"
                severity = EventSeverity.NORMAL
            else:
                event_type = TrackingEventType.IN_TRANSIT
                severity = EventSeverity.NORMAL
                desc = f"Passed waypoint {i}"

            if s.shipment_ref == "NX-1042" and i == num_events - 2:
                event_type = TrackingEventType.ETA_REVISION
                severity = EventSeverity.WARNING
                desc = "ETA revised due to port congestion"

            if s.shipment_ref == "NX-1087" and i == num_events - 2:
                event_type = TrackingEventType.DISRUPTION
                severity = EventSeverity.WARNING
                desc = "Weather delay reported at Dubai"

            event = TrackingEvent(
                shipment_id=s.id,
                timestamp=event_times[i] if i < len(event_times) else now,
                lat=wp[0],
                lng=wp[1],
                location_name=f"Waypoint {i}",
                event_type=event_type,
                description=desc,
                severity=severity
            )
            db.add(event)
    db.flush()


def _seed_documents(db: Session):
    nx1042 = db.query(Shipment).filter(Shipment.shipment_ref == "NX-1042").first()
    if nx1042:
        docs = [
            Document(
                shipment_id=nx1042.id,
                type=DocumentType.BILL_OF_LADING,
                file_path="uploads/bol_nx1042.pdf",
                status=DocumentStatus.PROCESSED
            ),
            Document(
                shipment_id=nx1042.id,
                type=DocumentType.COMMERCIAL_INVOICE,
                file_path="uploads/invoice_nx1042.pdf",
                status=DocumentStatus.PROCESSED
            ),
            Document(
                shipment_id=nx1042.id,
                type=DocumentType.PACKING_LIST,
                file_path="uploads/packing_nx1042.pdf",
                status=DocumentStatus.PROCESSED
            ),
        ]
        db.add_all(docs)
        db.flush()

        for doc in docs:
            if doc.type == DocumentType.BILL_OF_LADING:
                extraction = DocumentExtraction(
                    document_id=doc.id,
                    extracted_json={
                        "shipment_ref": "NX-1042",
                        "cargo": "Electronics components",
                        "quantity": 950,
                        "weight": 4750.0,
                        "value": 118750.0,
                        "origin": "Shanghai",
                        "destination": "Rotterdam"
                    },
                    confidence=0.95
                )
            elif doc.type == DocumentType.COMMERCIAL_INVOICE:
                extraction = DocumentExtraction(
                    document_id=doc.id,
                    extracted_json={
                        "shipment_ref": "NX-1042",
                        "cargo": "Electronics components",
                        "quantity": 1000,
                        "weight": 5000.0,
                        "value": 125000.0,
                        "origin": "Shanghai",
                        "destination": "Rotterdam"
                    },
                    confidence=0.98
                )
            else:
                extraction = DocumentExtraction(
                    document_id=doc.id,
                    extracted_json={
                        "shipment_ref": "NX-1042",
                        "cargo": "Electronics components",
                        "quantity": 1000,
                        "weight": 5000.0,
                        "value": 125000.0,
                        "origin": "Shanghai",
                        "destination": "Rotterdam"
                    },
                    confidence=0.97
                )
            db.add(extraction)

        discrepancy = DocumentDiscrepancy(
            shipment_id=nx1042.id,
            field_name="quantity",
            values_by_document={
                "BILL_OF_LADING": 950,
                "COMMERCIAL_INVOICE": 1000,
                "PACKING_LIST": 1000
            },
            difference_description="BOL shows 950 units while Invoice and Packing List show 1000 units. Difference of 50 units.",
            potential_impact="Customs / clearance risk"
        )
        db.add(discrepancy)

    for ref in ["NX-1091", "NX-1134"]:
        s = db.query(Shipment).filter(Shipment.shipment_ref == ref).first()
        if s:
            exc = ShipmentException(
                shipment_id=s.id,
                reason_summary="Missing required documentation",
                priority=ExceptionPriority.MEDIUM
            )
            db.add(exc)
    db.flush()


def _seed_alerts(db: Session):
    nx1042 = db.query(Shipment).filter(Shipment.shipment_ref == "NX-1042").first()
    alerts = [
        Alert(shipment_id=nx1042.id if nx1042 else None, type=AlertType.HIGH_RISK, message="NX-1042 risk score increased to HIGH (78/100) due to document discrepancy and port congestion."),
        Alert(shipment_id=nx1042.id if nx1042 else None, type=AlertType.DOCUMENT_ALERT, message="Quantity mismatch detected: BOL 950 vs Invoice 1000 for NX-1042."),
        Alert(shipment_id=nx1042.id if nx1042 else None, type=AlertType.DELAY_ALERT, message="ETA shifted by 21 hours for NX-1042 due to Rotterdam port congestion."),
        Alert(shipment_id=None, type=AlertType.DISRUPTION_ALERT, message="Rotterdam port congestion may affect 7 shipments."),
    ]
    db.add_all(alerts)
    db.flush()


def _seed_insights(db: Session):
    insights = [
        AIInsight(text="7 shipments may be affected by Rotterdam port congestion.", source_type=InsightSourceType.DISRUPTION),
        AIInsight(text="2 shipments have documentation inconsistencies.", source_type=InsightSourceType.DOCUMENT),
        AIInsight(text="NX-1042 has the highest current risk score among active shipments.", source_type=InsightSourceType.RISK),
        AIInsight(text="Average fleet risk is currently at a manageable level.", source_type=InsightSourceType.NETWORK),
    ]
    db.add_all(insights)
    db.flush()


if __name__ == "__main__":
    seed_data()
