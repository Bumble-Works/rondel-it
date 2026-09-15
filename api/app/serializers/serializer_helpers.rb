module SerializerHelpers
  module_function

  def deep_camelize(value)
    case value
    when Array
      value.map { |item| deep_camelize(item) }
    when Hash
      value.each_with_object({}) do |(key, item), result|
        camel_key = key.to_s.camelize(:lower)
        result[camel_key] = deep_camelize(item)
      end
    else
      value
    end
  end
end
