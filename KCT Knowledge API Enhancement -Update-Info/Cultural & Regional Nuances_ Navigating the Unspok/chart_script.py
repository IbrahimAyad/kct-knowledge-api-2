import plotly.graph_objects as go
import pandas as pd

# Create the data
data = [
    {"Area": "Downtown Detroit", "Style_Diversity_Score": 7, "Primary_Influence": "Urban Professional"},
    {"Area": "Royal Oak", "Style_Diversity_Score": 4, "Primary_Influence": "Finance Fratty"},
    {"Area": "Midtown Detroit", "Style_Diversity_Score": 9, "Primary_Influence": "Hipster Artist"},
    {"Area": "General Suburbs", "Style_Diversity_Score": 3, "Primary_Influence": "Mall Casual"},
    {"Area": "Ferndale", "Style_Diversity_Score": 5, "Primary_Influence": "College Influenced"},
    {"Area": "Ann Arbor", "Style_Diversity_Score": 6, "Primary_Influence": "Outdoor Athletic"},
    {"Area": "Hamtramck", "Style_Diversity_Score": 8, "Primary_Influence": "Multicultural Eclectic"},
    {"Area": "Dearborn", "Style_Diversity_Score": 6, "Primary_Influence": "Cultural Heritage"}
]

df = pd.DataFrame(data)

# Sort by Style Diversity Score for better visualization
df = df.sort_values('Style_Diversity_Score', ascending=False)

# Create abbreviated area names to fit 15 character limit
df['Area_Short'] = df['Area'].str.replace('Downtown Detroit', 'Downtown Det').str.replace('Midtown Detroit', 'Midtown Det').str.replace('General Suburbs', 'Gen Suburbs')

# Create the bar chart
fig = go.Figure(data=[
    go.Bar(
        x=df['Area_Short'],
        y=df['Style_Diversity_Score'],
        marker_color='#1FB8CD',
        hovertemplate='<b>%{x}</b><br>Score: %{y}<extra></extra>',
        cliponaxis=False
    )
])

# Update layout
fig.update_layout(
    title='Detroit Style Diversity Scores',
    xaxis_title='Area',
    yaxis_title='Style Score',
    yaxis=dict(range=[0, 10])
)

# Save the chart
fig.write_image('detroit_style_chart.png')