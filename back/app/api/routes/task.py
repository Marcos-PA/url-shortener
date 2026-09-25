from fastapi import APIRouter

from app.db.session import DbSession
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.services import tasks as tasks_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
def list_tasks(db: DbSession):
    return tasks_service.list_tasks(db)


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(db: DbSession, task: TaskCreate):
    return tasks_service.create_task(db, task)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(db: DbSession, task_id: int, task: TaskUpdate):
    return tasks_service.update_task(db, task_id, task)


@router.delete("/{task_id}", status_code=204)
def delete_task(db: DbSession, task_id: int):
    tasks_service.delete_task(db, task_id)
