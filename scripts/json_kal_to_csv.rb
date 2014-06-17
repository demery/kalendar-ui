#!/usr/bin/env ruby

require 'csv'
require 'json'

data = JSON.load(open(ARGV.shift))

# {
#   "day": "01",
#   "month": "01",
#   "dominicalLetter": "A",
#   "goldenNumber": {
#     "roman": "iii",
#     "arabic": 3
#   },
#   "kni": "kalends"
# }
csv_string = CSV.generate do |csv|
  csv << %w( Month Day GoldenNo. Letter KNI )
  data.each do |day|
    gn = day['goldenNumber'] && day['goldenNumber']['roman']
    csv << [ "=\"#{day['month']}\"", "=\"#{day['day']}\"", gn, day['dominicalLetter'], day['kni'] ]
  end
end

puts csv_string