#!/usr/bin/env ruby

require 'json'
require 'roman-numerals'

LONG_MONTHS = %w( 03 05 07 10 )

# Input looks like this
# Note: some rows lack golden number
#     KL  JANUARIUS
#     01.01.  A iii
#     02.01.  b
#     03.01.  c xi
#     04.01.  d
#     05.01.  e xix
#     06.01.  f viii
#     07.01.  g
#     08.01.  A xvi
#     09.01.  b v
#     10.01.  c
#     11.01.  d xiii
#     12.01.  e ii
#     13.01.  f
#     14.01.  g x
#     15.01.  A
#     16.01.  b xviii
#     17.01.  c vii
#     18.01.  d
#     19.01.  e xv
#     20.01.  f iiii
#     21.01.  g
#     22.01.  A xii
#     23.01.  b i
#     24.01.  c
#     25.01.  d ix
#     26.01.  e
#     27.01.  f xvii
#     28.01.  g vi
#     29.01.  A
#     30.01.  b xiiii
#     31.01.  c iii
# ....

# Build a hash of all the months from the input
months = {}
IO.foreach(ARGV.shift) do |line|
  if line =~ /\d+/
    # Convert each line to an array
    #  01.01.  A  iii => [ '01', '01', 'A', 'iii' ]
    #  02.01.  b      => [ '02', '01', 'b' ]
    day = line.strip.split /[.\s]+/
    # add empty fourth element if needed
    day[3] ||= ''
    month = day[1]
    (months[month] ||= []) << day
  end
end

# Add Kalends/Nones/Ides for each day of each month.
# The fifth element of each day array will be the kni:
#
# 01.01.  A  iii => [ '01', '01', 'A', 'iii', 'kalends' ]
# 02.01.  b      => [ '02', '01', 'b', '',    '4 nones' ]
months.each do |month,days|
  nones   = LONG_MONTHS.include?(month) ? 7 : 5
  ides    = LONG_MONTHS.include?(month) ? 15 : 13
  # kalends is the last day of the month + 1
  kalends = days.last.first.to_i + 1

  # kalends
  days[0] << 'kalends'

  # nones
  days[1..(nones-2)].each do |day|
    day << sprintf("%d nones", (nones + 1) - day.first.to_i)
  end
  days[nones-1] << 'nones'

  # ides
  days[nones..(ides-2)].each do |day|
    day << sprintf("%d ides", (ides + 1) - day.first.to_i)
  end
  days[ides-1] << 'ides'

  # next month's kalends
  days[ides..-1].each do |day|
    day << sprintf("%d kalends", (kalends + 1) - day.first.to_i)
  end
end

# Build array of all days in the year
year = []
months.each do |month,days|
  days.each do |day|
    hash                   = {}
    hash[:day]             = day.shift
    hash[:month]           = day.shift
    hash[:dominicalLetter] = day.shift
    gnum                   = day.shift
    if ! gnum.empty?
      hash[:goldenNumber]  = {
        roman: gnum,
        arabic: RomanNumerals.to_decimal(gnum.dup)
      }
    end

    kni                    = day.shift
    romanDay = if kni =~ /\d+/
      num = $&.to_i
      { roman: RomanNumerals.to_medieval(num).downcase, arabic: num }
    else
      {}
    end

    hash[:romanDay] = case kni
    when /kalends/i
      { kni: 'kalends' }.merge(romanDay)
    when /nones/i
      { kni: 'nones' }.merge(romanDay)
    when /ides/i
      { kni: 'ides' }.merge(romanDay)
    end
    year << hash
  end
end

# create a simple array of all dates
date_indices = []
year.each do |date|
  date_indices << sprintf("%02d-%02d", date[:month].to_i, date[:day].to_i)
end

data_dir =  File.expand_path('../../data', __FILE__)
kalendar_file = File.join(data_dir, 'full_kalendar.json')
File.open(kalendar_file, 'w+') do |f|
  # f.puts JSON.generate(year)
  f.puts JSON.pretty_generate(year)
  puts "Wrote #{kalendar_file}"
end

index_file = File.join data_dir, 'date_indices.json'
File.open(index_file, 'w+') do |f|
  f.puts JSON.generate(date_indices)
  puts "Wrote #{index_file}"
end
