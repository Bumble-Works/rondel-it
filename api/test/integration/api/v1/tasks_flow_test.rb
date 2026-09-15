require "test_helper"

module Api
  module V1
    class TasksFlowTest < ActionDispatch::IntegrationTest
      test "creates and advances a task" do
        post "/api/v1/tasks", params: { title: "Ship stage one", day_date: Date.current.iso8601 }
        assert_response :created

        task = response.parsed_body.fetch("task")
        assert_equal "todo", task.fetch("status")

        post "/api/v1/tasks/#{task.fetch('id')}/advance"
        assert_response :success
        assert_equal "doing", response.parsed_body.dig("task", "status")

        post "/api/v1/tasks/#{task.fetch('id')}/advance"
        assert_response :success
        assert_equal "done", response.parsed_body.dig("task", "status")
      end

      test "rondels an unfinished task and increments count" do
        post "/api/v1/tasks", params: { title: "Deep work", day_date: Date.current.iso8601 }
        task_id = response.parsed_body.dig("task", "id")

        target_date = (Date.current + 1).iso8601
        post "/api/v1/tasks/#{task_id}/rondel", params: { to_date: target_date }
        assert_response :success

        source_task = response.parsed_body.fetch("sourceTask")
        resulting_task = response.parsed_body.fetch("resultingTask")

        assert_equal 1, source_task.fetch("rondelCount")
        assert_equal "todo", resulting_task.fetch("status")
        assert_equal target_date, resulting_task.fetch("dayDate")
      end
    end
  end
end
