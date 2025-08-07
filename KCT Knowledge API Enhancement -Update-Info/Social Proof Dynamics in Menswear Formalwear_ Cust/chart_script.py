import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np

# Data for social proof impact ranking (in order from highest to lowest impact)
mechanisms = ["Wedding Party Coordination", "Peer Recommendations", "Group Purchasing", "User Reviews & Ratings", "Celebrity Endorsements", "Influencer Partnerships", "Social Media Mentions", "Expert Testimonials", "User-Generated Content", "Social Media Engagement"]
impact = [89, 87, 85, 82, 76, 74, 71, 69, 68, 63]

# Create DataFrame
df = pd.DataFrame({
    'Mechanism': mechanisms,
    'Impact': impact
})

# Abbreviate mechanism names to fit 15 character limit, keeping original order
df['Short_Name'] = [
    'Wedding Coord',
    'Peer Recoms', 
    'Group Purchase',
    'User Reviews',
    'Celebrity End',
    'Influencer',
    'Social Mentions',
    'Expert Test',
    'User Content',
    'Social Engage'
]

# For horizontal bar chart, reverse order so highest impact appears at top
df_reversed = df.iloc[::-1].copy()

# Create gradient colors from dark (lowest impact) to bright (highest impact)
# Using brand colors to create a gradient effect
n_colors = len(df_reversed)
# Create a gradient from dark cyan to bright cyan
color_start = np.array([19, 52, 59])  # #13343B (Dark cyan)
color_end = np.array([31, 184, 205])  # #1FB8CD (Strong cyan)

gradient_colors = []
for i in range(n_colors):
    # Interpolate between start and end colors
    ratio = i / (n_colors - 1)
    color = color_start + ratio * (color_end - color_start)
    color_hex = f"rgb({int(color[0])}, {int(color[1])}, {int(color[2])})"
    gradient_colors.append(color_hex)

# Create horizontal bar chart
fig = go.Figure(go.Bar(
    x=df_reversed['Impact'],
    y=df_reversed['Short_Name'],
    orientation='h',
    marker=dict(color=gradient_colors),
    text=[f'{x}%' for x in df_reversed['Impact']],
    textposition='outside',
    cliponaxis=False
))

# Update layout
fig.update_layout(
    title='Social Proof Impact Ranking',
    xaxis_title='Impact (%)',
    yaxis_title='Social Proof Mechanism',
    showlegend=False
)

# Update axes
fig.update_xaxes(range=[0, 100])
fig.update_yaxes(categoryorder='array', categoryarray=df_reversed['Short_Name'].tolist())

# Save the chart
fig.write_image('social_proof_impact_updated.png')