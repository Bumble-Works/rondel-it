module Api
  module V1
    class TasksController < ApplicationController
      before_action :find_task, only: [:update, :advance, :rondel, :note, :events]

      def create
        task = Task.new(task_params)
        task.position = Task.for_day(task.day_date).count

        if task.save
          TaskEvent.create!(
            task: task,
            event_type: :created,
            from_value: nil,
            to_value: task.status,
            occurred_on: task.day_date
          )
          render json: { task: TaskSerializer.call(task) }, status: :created
        else
          render json: { error: task.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      def update
        if @task.update(task_update_params)
          TaskEvent.create!(
            task: @task,
            event_type: :category_changed,
            from_value: nil,
            to_value: @task.category_ids.join(","),
            occurred_on: @task.day_date
          ) if params.key?(:category_ids)

          render json: { task: TaskSerializer.call(@task.reload) }
        else
          render json: { error: @task.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      def advance
        result = Tasks::AdvanceStatus.call(@task)
        if result.success?
          render json: { task: TaskSerializer.call(result.task.reload) }
        else
          render json: { error: result.error }, status: :unprocessable_entity
        end
      end

      def rondel
        result = Tasks::Rondel.call(task: @task, to_date: params[:to_date], reason: params[:reason])
        if result.success?
          render json: {
            sourceTask: TaskSerializer.call(result.source_task.reload),
            resultingTask: TaskSerializer.call(result.resulting_task.reload)
          }
        else
          render json: { error: result.error }, status: :unprocessable_entity
        end
      end

      def note
        result = Notes::Upsert.call(task: @task, body: params[:body])
        if result.success?
          render json: { task: TaskSerializer.call(@task.reload) }
        else
          render json: { error: result.error }, status: :unprocessable_entity
        end
      end

      def events
        events = @task.task_events.order(created_at: :asc)
        render json: { events: events.map { |event| TaskEventSerializer.call(event) } }
      end

      private

      def find_task
        @task = Task.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Task not found" }, status: :not_found
      end

      def task_params
        params.permit(:title, :day_date, category_ids: []).tap do |safe|
          safe[:status] = :todo
        end
      end

      def task_update_params
        params.permit(:title, category_ids: [])
      end
    end
  end
end
