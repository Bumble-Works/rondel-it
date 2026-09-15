class TaskEventSerializer
  def self.call(task_event)
    SerializerHelpers.deep_camelize(
      {
        id: task_event.id,
        task_id: task_event.task_id,
        event_type: task_event.event_type,
        from_value: task_event.from_value,
        to_value: task_event.to_value,
        occurred_on: task_event.occurred_on,
        created_at: task_event.created_at
      }
    )
  end
end
