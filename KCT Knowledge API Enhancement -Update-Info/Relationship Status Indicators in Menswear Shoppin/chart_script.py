import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import numpy as np

# Create DataFrame from provided JSON data
data = {
    "purchase_behaviors": ["Formal wear shopping increase", "Suit quality upgrade", "New dress shirt purchases", "Formal shoe investment", "Grooming service bookings", "Jewelry store visits", "Photography service research", "Fine dining reservations", "Travel booking patterns", "Weekend activity changes", "Style consultation requests", "Accessory upgrades", "Pocket organization products", "Cologne/fragrance purchases", "Hair styling appointments"],
    "reliability_scores": [8, 9, 7, 8, 9, 6, 7, 8, 7, 6, 8, 7, 10, 6, 8],
    "frequency_increases": [250, 300, 180, 220, 400, 150, 200, 350, 180, 160, 275, 190, 600, 140, 300],
    "detection_difficulty": [6, 5, 7, 6, 4, 8, 7, 5, 6, 7, 5, 6, 3, 7, 6],
    "timelines": ["2-4 weeks", "3-6 weeks", "1-3 weeks", "2-4 weeks", "1-2 weeks", "4-8 weeks", "3-6 weeks", "1-2 weeks", "2-6 weeks", "2-4 weeks", "3-8 weeks", "1-4 weeks", "1-2 weeks", "1-3 weeks", "1-2 weeks"]
}

df = pd.DataFrame(data)

# Map timelines to simplified categories
timeline_mapping = {
    "1-2 weeks": "1-2 weeks",
    "1-3 weeks": "1-2 weeks", 
    "1-4 weeks": "2-4 weeks",
    "2-4 weeks": "2-4 weeks",
    "2-6 weeks": "2-4 weeks",
    "3-6 weeks": "3-8 weeks",
    "3-8 weeks": "3-8 weeks",
    "4-8 weeks": "3-8 weeks"
}

df['timeline_cat'] = df['timelines'].map(timeline_mapping)

# Create abbreviated behavior names (15 char limit)
df['behavior_short'] = [
    "Formal wear", "Suit upgrade", "Dress shirts", "Formal shoes", 
    "Grooming svc", "Jewelry", "Photography", "Fine dining",
    "Travel", "Weekend chg", "Style consult", "Accessories",
    "Pocket org", "Cologne", "Hair styling"
]

# Invert detection difficulty for bubble size (easier = larger bubbles)
df['bubble_size'] = 11 - df['detection_difficulty']

# Define colors for timeline categories
colors = ['#1FB8CD', '#DB4545', '#2E8B57']
color_map = {
    '1-2 weeks': colors[0],
    '2-4 weeks': colors[1], 
    '3-8 weeks': colors[2]
}

# Create scatter plot
fig = go.Figure()

for i, timeline in enumerate(['1-2 weeks', '2-4 weeks', '3-8 weeks']):
    subset = df[df['timeline_cat'] == timeline]
    fig.add_trace(go.Scatter(
        x=subset['reliability_scores'],
        y=subset['frequency_increases'],
        mode='markers+text',
        marker=dict(
            size=subset['bubble_size'] * 8,
            color=colors[i],
            opacity=0.7,
            line=dict(width=1, color='white')
        ),
        text=subset['behavior_short'],
        textposition='top center',
        textfont=dict(size=8),
        name=timeline,
        hovertemplate='<b>%{text}</b><br>' +
                     'Reliability: %{x}<br>' +
                     'Freq Inc: %{y}%<br>' +
                     'Timeline: ' + timeline +
                     '<extra></extra>',
        cliponaxis=False
    ))

# Add quadrant lines
median_reliability = df['reliability_scores'].median()
median_frequency = df['frequency_increases'].median()

fig.add_hline(y=median_frequency, line_dash="dash", line_color="gray", opacity=0.5)
fig.add_vline(x=median_reliability, line_dash="dash", line_color="gray", opacity=0.5)

# Add quadrant labels
fig.add_annotation(x=9, y=500, text="High Rel/High Freq", showarrow=False, 
                  font=dict(size=10, color="gray"), bgcolor="white", opacity=0.8)
fig.add_annotation(x=5, y=500, text="Low Rel/High Freq", showarrow=False,
                  font=dict(size=10, color="gray"), bgcolor="white", opacity=0.8)
fig.add_annotation(x=9, y=150, text="High Rel/Low Freq", showarrow=False,
                  font=dict(size=10, color="gray"), bgcolor="white", opacity=0.8)
fig.add_annotation(x=5, y=150, text="Low Rel/Low Freq", showarrow=False,
                  font=dict(size=10, color="gray"), bgcolor="white", opacity=0.8)

# Update layout
fig.update_layout(
    title="Proposal Indicators Analysis",
    xaxis_title="Reliability",
    yaxis_title="Freq Inc (%)",
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    showlegend=True
)

fig.update_xaxes(range=[4, 11])
fig.update_yaxes(range=[100, 650])

# Save the chart
fig.write_image("proposal_indicators_analysis.png")