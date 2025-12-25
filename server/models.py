from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTableUUID

from server.db import Base


class User(SQLAlchemyBaseUserTableUUID, Base):
    pass
