module Tasks
  class Reorder
    def self.call(day_date)
      tasks = Task.for_day(day_date).order(:created_at).to_a
      active_tasks = tasks.reject(&:done?)
      done_tasks = tasks.select(&:done?)
      ordered = active_tasks + done_tasks

      Task.transaction do
        ordered.each_with_index do |task, index|
          task.update_columns(position: index, updated_at: Time.current)
        end
      end
    end
  end
end
