# Find a room for an activity

Build a read-only room guide for a fictional community center. A visitor chooses a date and time window, enters their group size, and indicates whether they need step-free access and a projector. They compare rooms against existing bookings and features, then leave knowing which room fits and why. A suitable room must fit the entire time window, group size, and requested features.

Use `source.json`. All dates and times are local community-center times. Bookings occupy a half-open time interval: a booking that ends at 14:00 does not conflict with one beginning at 14:00. Rooms are open from 09:00 to 18:00. Explain when a room is occupied or lacks a requested feature. Show no-match results without suggesting that the visitor has made a reservation. Do not hide the date, time, or constraints when changing filters.

Keep the guide readable on a narrow viewport and make the selection and comparison work with the keyboard. A visitor must be able to explain the selected room's capacity, features, and availability from the interface. This guide cannot book rooms or change the schedule. No accounts, live calendar connection, approval action, or recommendation based on facts outside the supplied fixture is part of the task.
