class CategorySerializer
  def self.call(category)
    SerializerHelpers.deep_camelize(
      {
        id: category.id,
        name: category.name,
        color: category.color,
        created_at: category.created_at,
        updated_at: category.updated_at
      }
    )
  end
end
