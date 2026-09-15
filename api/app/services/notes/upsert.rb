module Notes
  class Upsert
    Result = Struct.new(:success?, :task_note, :error, keyword_init: true)

    def self.call(task:, body:)
      task_note = nil

      Task.transaction do
        task_note = task.task_note || task.build_task_note
        task_note.update!(body: body.to_s)

        TaskEvent.create!(
          task: task,
          event_type: :note_updated,
          from_value: nil,
          to_value: body.to_s.truncate(100),
          occurred_on: task.day_date
        )
      end

      Result.new(success?: true, task_note: task_note)
    rescue ActiveRecord::RecordInvalid => e
      Result.new(success?: false, error: e.message)
    end
  end
end
