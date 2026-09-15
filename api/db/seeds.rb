work = Category.find_or_create_by!(name: "Work") { |category| category.color = "#2563eb" }
personal = Category.find_or_create_by!(name: "Personal") { |category| category.color = "#16a34a" }

today = Date.current

tasks = [
	{ title: "Write architecture notes", status: :todo, category_ids: [work.id] },
	{ title: "Prototype task row animation", status: :doing, category_ids: [work.id] },
	{ title: "Review inbox", status: :done, category_ids: [personal.id], completed_at: Time.current }
]

tasks.each_with_index do |attrs, index|
	task = Task.create!(
		title: attrs[:title],
		status: attrs[:status],
		day_date: today,
		position: index,
		rondel_count: 0,
		completed_at: attrs[:completed_at]
	)
	task.category_ids = attrs[:category_ids]
	TaskEvent.create!(
		task: task,
		event_type: :created,
		from_value: nil,
		to_value: task.status,
		occurred_on: today
	)
end

UserSetting.first_or_create!(end_of_day_time: "17:00", timezone: "UTC")
