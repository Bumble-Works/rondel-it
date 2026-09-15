module Tasks
  class Rondel
    Result = Struct.new(:success?, :source_task, :resulting_task, :error, keyword_init: true)

    def self.call(task:, to_date:, reason: nil)
      target_date = Date.parse(to_date.to_s)

      resulting_task = nil

      Task.transaction do
        task.update!(rondel_count: task.rondel_count + 1)

        resulting_task = Task.create!(
          title: task.title,
          status: :todo,
          day_date: target_date,
          position: Task.for_day(target_date).count,
          rondel_count: task.rondel_count,
          origin_task_id: task.origin_task_id || task.id,
          previous_task_id: task.id
        )

        resulting_task.category_ids = task.category_ids

        TaskEvent.create!(
          task: task,
          event_type: :rondelled,
          from_value: task.day_date.to_s,
          to_value: target_date.to_s,
          occurred_on: task.day_date
        )

        RondelEvent.create!(
          task: task,
          resulting_task: resulting_task,
          from_date: task.day_date,
          to_date: target_date,
          from_status: task.status,
          reason: reason
        )

        Tasks::Reorder.call(task.day_date)
        Tasks::Reorder.call(target_date)
      end

      Result.new(success?: true, source_task: task, resulting_task: resulting_task)
    rescue ArgumentError
      Result.new(success?: false, error: "Invalid date")
    rescue ActiveRecord::RecordInvalid => e
      Result.new(success?: false, error: e.message)
    end
  end
end
