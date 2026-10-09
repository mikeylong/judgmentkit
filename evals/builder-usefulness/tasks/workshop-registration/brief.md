# Register for a community workshop

Build a local interface for someone booking places at a fictional community workshop. They choose a session, enter a contact name and email, choose the number of places, review the price, and register. They should leave with a confirmation containing the session, date, time, participant count, contact, and total price.

Use `source.json` as the session and booking authority. Prices are USD per person. Reject a quantity that exceeds remaining places, show a useful error, and preserve entered contact details so the visitor can correct it. A successful submission reduces that session's remaining places, adds one booking, and displays a receipt. Pressing the submission button twice must create only one registration.

Keep the session list and confirmation readable on a narrow phone viewport. The whole path must work with the keyboard, and field errors must identify the field and correction. The person can start another booking from the receipt. Use local state; a reload may reset the supplied fixture. No accounts, payments, network service, or email delivery are part of this task.
