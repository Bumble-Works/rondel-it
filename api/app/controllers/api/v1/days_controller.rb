module Api
  module V1
    class DaysController < ApplicationController
      def tasks
        day_date = Date.parse(params[:date])
        tasks = Task.for_day(day_date).includes(:task_note).ordered_for_day
        render json: { tasks: tasks.map { |task| TaskSerializer.call(task) } }
      rescue ArgumentError
        render json: { error: "Invalid date" }, status: :unprocessable_entity
      end
    end
  end
end
