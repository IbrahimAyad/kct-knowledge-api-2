import plotly.express as px
import pandas as pd

# Create the data
data = [
    {"Signal_Category": "Responsibility Expansion", "Reliability_Score": 95, "Timing_Before_Promotion_Months": 12},
    {"Signal_Category": "Meeting Attendance", "Reliability_Score": 90, "Timing_Before_Promotion_Months": 6},
    {"Signal_Category": "Wardrobe Upgrade", "Reliability_Score": 85, "Timing_Before_Promotion_Months": 3},
    {"Signal_Category": "Office Space Change", "Reliability_Score": 85, "Timing_Before_Promotion_Months": 2},
    {"Signal_Category": "Networking Events", "Reliability_Score": 80, "Timing_Before_Promotion_Months": 2},
    {"Signal_Category": "Travel Increase", "Reliability_Score": 75, "Timing_Before_Promotion_Months": 4},
    {"Signal_Category": "Formal Training", "Reliability_Score": 70, "Timing_Before_Promotion_Months": 8},
    {"Signal_Category": "Salary Negotiation", "Reliability_Score": 60, "Timing_Before_Promotion_Months": 1}
]

df = pd.DataFrame(data)

# Abbreviate long category names to fit 15 character limit
df['Signal_Short'] = df['Signal_Category'].replace({
    'Responsibility Expansion': 'Resp Expansion',
    'Meeting Attendance': 'Meet Attend',
    'Wardrobe Upgrade': 'Wardrobe Upg',
    'Office Space Change': 'Office Space',
    'Networking Events': 'Network Events',
    'Travel Increase': 'Travel Increase',
    'Formal Training': 'Formal Training',
    'Salary Negotiation': 'Salary Negot'
})

# Sort by reliability score for better visualization
df = df.sort_values('Reliability_Score')

# Create horizontal bar chart
fig = px.bar(
    df, 
    x='Reliability_Score', 
    y='Signal_Short',
    color='Timing_Before_Promotion_Months',
    orientation='h',
    color_continuous_scale='viridis',
    title='Promotion Signals Reliability',
    labels={
        'Reliability_Score': 'Reliability %',
        'Signal_Short': 'Signals',
        'Timing_Before_Promotion_Months': 'Months Before'
    }
)

# Update traces with cliponaxis
fig.update_traces(cliponaxis=False)

# Update layout
fig.update_layout(
    coloraxis_colorbar=dict(title="Months Before")
)

# Update x-axis range
fig.update_xaxes(range=[0, 100])

# Save the chart
fig.write_image("promotion_signals_chart.png")