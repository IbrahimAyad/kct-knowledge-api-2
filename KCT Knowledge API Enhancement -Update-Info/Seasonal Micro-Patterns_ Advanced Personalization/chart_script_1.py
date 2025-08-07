import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd

# Create the data
data = [
    {"Month": "March", "Graduation_Volume_Percentage": 5, "Average_Spend_Per_Customer": 850},
    {"Month": "April", "Graduation_Volume_Percentage": 15, "Average_Spend_Per_Customer": 1200},
    {"Month": "May", "Graduation_Volume_Percentage": 45, "Average_Spend_Per_Customer": 1500},
    {"Month": "June", "Graduation_Volume_Percentage": 30, "Average_Spend_Per_Customer": 1300},
    {"Month": "July", "Graduation_Volume_Percentage": 3, "Average_Spend_Per_Customer": 600},
    {"Month": "August", "Graduation_Volume_Percentage": 2, "Average_Spend_Per_Customer": 500}
]

df = pd.DataFrame(data)

# Create figure with secondary y-axis
fig = make_subplots(specs=[[{"secondary_y": True}]])

# Add bar chart for graduation volume percentage
fig.add_trace(
    go.Bar(
        x=df['Month'],
        y=df['Graduation_Volume_Percentage'],
        name='Grad Volume %',
        marker_color='#1FB8CD',
        cliponaxis=False
    ),
    secondary_y=False,
)

# Add line chart for average spend per customer
fig.add_trace(
    go.Scatter(
        x=df['Month'],
        y=df['Average_Spend_Per_Customer'],
        mode='lines+markers',
        name='Avg Spend',
        line=dict(color='#DB4545', width=3),
        marker=dict(size=8),
        cliponaxis=False
    ),
    secondary_y=True,
)

# Set x-axis title
fig.update_xaxes(title_text="Month")

# Set y-axes titles
fig.update_yaxes(title_text="Volume %", secondary_y=False)
fig.update_yaxes(title_text="Spend ($)", secondary_y=True)

# Format second y-axis for spend with k abbreviation
fig.update_yaxes(
    tickvals=[500, 600, 850, 1200, 1300, 1500],
    ticktext=['0.5k', '0.6k', '0.85k', '1.2k', '1.3k', '1.5k'],
    secondary_y=True
)

# Update layout
fig.update_layout(
    title='Graduation Season Planning',
    legend=dict(
        orientation='h',
        yanchor='bottom',
        y=1.05,
        xanchor='center',
        x=0.5
    )
)

# Save the chart
fig.write_image('graduation_planning_chart.png')