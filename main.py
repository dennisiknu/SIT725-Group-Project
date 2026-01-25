from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
from typing import List, Optional

# Database Configuration (SQLite - no extra setup needed)
SQLALCHEMY_DATABASE_URL = "sqlite:///./task_database.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Task Database Model (maps to SQLite table)
class DBTask(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)  # Task title
    description = Column(String, nullable=True)        # Task description
    status = Column(String, default="To Do")           # Status: To Do / In Progress / Done
    progress = Column(Float, default=0.0)              # Progress percentage (0-100)
    priority = Column(String, default="Medium")        # Priority: High / Medium / Low
    due_date = Column(DateTime, nullable=True)         # Task due date
    created_at = Column(DateTime, default=datetime.utcnow)  # Creation time

# Create database tables automatically
Base.metadata.create_all(bind=engine)

# FastAPI App Initialization
app = FastAPI(title="Task Management API", version="1.0")

# CORS Middleware (allow frontend access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For Codespaces development (replace with frontend URL in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Dependency (get DB session)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas (data validation - request/response)
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = "Medium"

class TaskCreate(TaskBase):
    pass  # Inherit from TaskBase for task creation

class TaskUpdateStatus(BaseModel):
    status: str          # Update status (To Do/In Progress/Done)
    progress: float      # Update progress (0-100)

class TaskUpdateFilter(BaseModel):
    status: Optional[str] = None    # Filter by status
    priority: Optional[str] = None  # Filter by priority
    sort_by: Optional[str] = "created_at"  # Sort by: created_at / due_date / priority
    sort_order: Optional[str] = "desc"     # Sort order: asc / desc

class Task(TaskBase):
    id: int
    status: str
    progress: float
    created_at: datetime

    class Config:
        orm_mode = True  # Allow conversion from DB model to Pydantic schema

# API Endpoints
# 1. Create a new task
@app.post("/api/tasks", response_model=Task, summary="Create a new task")
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = DBTask(
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=task.due_date
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

# 2. Get all tasks (with filter & sort)
@app.post("/api/tasks/filter", response_model=List[Task], summary="Get tasks with filter and sort")
def get_filtered_tasks(filter: TaskUpdateFilter, db: Session = Depends(get_db)):
    # Base query
    query = db.query(DBTask)
    
    # Apply filters
    if filter.status:
        query = query.filter(DBTask.status == filter.status)
    if filter.priority:
        query = query.filter(DBTask.priority == filter.priority)
    
    # Apply sorting
    sort_column = getattr(DBTask, filter.sort_by, DBTask.created_at)
    if filter.sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    return query.all()

# 3. Update task status & progress (core feature from images)
@app.put("/api/tasks/{task_id}", response_model=Task, summary="Update task status and progress")
def update_task_status(
    task_id: int,
    task_update: TaskUpdateStatus,
    db: Session = Depends(get_db)
):
    # Validate progress range (0-100)
    if not 0.0 <= task_update.progress <= 100.0:
        raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")
    
    # Get task from DB
    db_task = db.query(DBTask).filter(DBTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update status and progress
    db_task.status = task_update.status
    db_task.progress = task_update.progress
    db.commit()
    db.refresh(db_task)
    return db_task

# 4. Delete a task
@app.delete("/api/tasks/{task_id}", summary="Delete a task")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(DBTask).filter(DBTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted successfully"}

# Run the app: uvicorn main:app --reload --host 0.0.0.0 --port 8000