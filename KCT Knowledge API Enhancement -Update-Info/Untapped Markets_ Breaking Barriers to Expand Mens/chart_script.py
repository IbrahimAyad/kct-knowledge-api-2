import plotly.graph_objects as go
import pandas as pd

# Create the data from the provided JSON
data = [
  {"Group": "Young Professionals", "Financial": 35, "Cultural": 25, "Practical": 20, "Knowledge": 15, "Shopping_Experience": 5},
  {"Group": "Middle-aged Men", "Financial": 20, "Cultural": 15, "Practical": 25, "Knowledge": 25, "Shopping_Experience": 15},
  {"Group": "Plus-size Men", "Financial": 15, "Cultural": 5, "Practical": 45, "Knowledge": 10, "Shopping_Experience": 25},
  {"Group": "Athletic Build Men", "Financial": 10, "Cultural": 5, "Practical": 50, "Knowledge": 20, "Shopping_Experience": 15},
  {"Group": "Men with Disabilities", "Financial": 5, "Cultural": 5, "Practical": 60, "Knowledge": 10, "Shopping_Experience": 20}
]

df = pd.DataFrame(data)

# Abbreviate group names to fit 15 character limit
group_abbreviations = {
    "Young Professionals": "Young Prof",
    "Middle-aged Men": "Middle-aged", 
    "Plus-size Men": "Plus-size",
    "Athletic Build Men": "Athletic",
    "Men with Disabilities": "w/ Disabilities"
}

df['Group_Short'] = df['Group'].map(group_abbreviations)

# Define the barriers and their abbreviated names
barriers = ['Financial', 'Cultural', 'Practical', 'Knowledge', 'Shopping_Experience']
barrier_names = ['Financial', 'Cultural', 'Practical', 'Knowledge', 'Shopping Exp']

# Brand colors in order
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C']

# Create the stacked bar chart
fig = go.Figure()

for i, (barrier, barrier_name) in enumerate(zip(barriers, barrier_names)):
    fig.add_trace(go.Bar(
        name=barrier_name,
        x=df['Group_Short'],
        y=df[barrier],
        marker_color=colors[i],
        cliponaxis=False
    ))

# Update layout
fig.update_layout(
    title='Suit Purchase Barriers by Group',
    barmode='stack',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Update axes
fig.update_xaxes(title='Demographic Grp')
fig.update_yaxes(title='Percentage (%)')

# Save the chart
fig.write_image('suit_barriers_stacked_bar.png')