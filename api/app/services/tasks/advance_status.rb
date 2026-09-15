module Tasks
  class AdvanceStatus
    Result = Struct.new(:success?, :task, :error, keyword_init: true)

    def self.call(task)
      return Result.new(success?: false, error: "Task is already done", task: task) if task.done?

      previous_status = task.status
      next_status = task.todo? ? :doing : :done

      Task.transaction do
        task.status = next_status
        task.completed_at = Time.current if next_status == :done
        task.save!

        TaskEvent.create!(
          task: task,
          event_type: :status_changed,
          from_value: previous_status,
          to_value: task.status,
          occurred_on: task.day_date
        )

        Tasks::Reorder.call(task.day_date)
      end

      Result.new(success?: true, task: task)
    rescue ActiveRecord::RecordInvalid => e
      Result.new(success?: false, error: e.message, task: task)
    end
  end
end
