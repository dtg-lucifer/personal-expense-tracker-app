This is a very minimal yet effective expense tracker / budget planner application.
I will be using this in a daily basis to track my expenses and manage my budget effectively. The application will allow
me to input my daily expenses, categorize them, and visualize my spending patterns over time. It will also provide
insights and suggestions to help me stay within my budget and make informed financial decisions.

I need you to understand the codebase properly by reading AGENTS.md
I need you to strictly follow the design guidelines written in DESIGN.md

I will be using react-native-chart-kit, documentation -> https://chartkit.io/llms.txt
I will be using tamagui as ui library -> https://tamagui.dev/llms.txt

This will have the features listed down below:

1. Daily logging of my expenses with categories (e.g., food, transportation, entertainment, etc.)
2. Dividing them into groups (custom and preconfigured)
3. Plot weekly and monthly expenses in line graph and discriminate expenses by category using donut charts
4. Weekly reports and monthly reports should stay in different tabs for easy access and comparison
5. I have no experience in android development so i need you to take the decisions for me, such as should we use sqlite
   or use async storage for data persistence, and how to structure the data for efficient retrieval and display.
6. Add an option to export data as csv files (more on this later)
7. The pages should look something like this:
   - Home page:
     - Overview of total expenses, quick add expense button, and summary of expenses by category. at the top it should have top expense this week below that should have a line chart about weekly expenses
     - below that it should have a table / list to show today's expenses so far
     - also a floating button to add or log an expense
       - it will open a modal with these fields
         - Name of expense
         - Amount
         - Category (dropdown with preconfigured categories and option to add custom category)
         - Description (optional)
         - Date (default to today, but can be changed)
         - Tags (seperated by spaces, optional)
   - Reports page: Tabs for weekly and monthly reports with line graphs and donut charts.
     - This page should have the option to filter by category and date range.
     - Also have an option to toggle between monthly, daily, weekly, and also yearly reports.
   - Settings page: Options to manage categories, export data, and configure app settings.
     - Here we should be able to add our own categories, edit existing ones, and delete them if needed.
     - Also, we should have an option to export data as CSV files from this page.
     - Exporting should support weekly, monthly and yearly data, also a custom date range option should be available.
