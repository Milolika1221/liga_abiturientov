from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, DateTime, Text, BigInteger, func
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase

class Base(DeclarativeBase):
    pass

class UserModel(Base):
    __tablename__ = "users"
    
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    @classmethod
    def from_domain(cls, user):
        return cls(
            user_id=user.user_id,
            username=user.username,
            role=user.role.value if hasattr(user.role, 'value') else str(user.role),
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    
    def to_domain(self):
        from domain import User, UserRole
        return User(
            user_id=self.user_id,
            username=self.username,
            role=UserRole(self.role) if self.role in [r.value for r in UserRole] else UserRole.USER,
            created_at=self.created_at,
            updated_at=self.updated_at
        )

class StateModel(Base):
    __tablename__ = "user_states"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    @classmethod
    def from_domain(cls, state):
        import json
        return cls(
            user_id=state.user_id,
            state=state.state_name,
            data=json.dumps(state.data) if state.data else None,
            created_at=state.created_at,
            updated_at=state.updated_at
        )
    
    def to_domain(self):
        from domain import BotState
        import json
        return BotState(
            user_id=self.user_id,
            state_name=self.state,
            data=json.loads(self.data) if self.data else {},
            created_at=self.created_at,
            updated_at=self.updated_at
        )
