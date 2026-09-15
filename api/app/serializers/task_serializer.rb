class TaskSerializer
  def self.call(task)
    SerializerHelpers.deep_camelize(
      {
        id: task.id,
        title: task.title,
        status: task.status,
        day_date: task.day_date,
        position: task.position,
        rondel_count: task.rondel_count,
        origin_task_id: task.origin_task_id,
        previous_task_id: task.previous_task_id,
        completed_at: task.completed_at,
        created_at: task.created_at,
        updated_at: task.updated_at,
        category_ids: task.category_ids,
        note: task.task_note&.body
      }
    )
  end
end
