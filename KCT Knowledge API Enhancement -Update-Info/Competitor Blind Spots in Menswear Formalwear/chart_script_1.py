import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Create the data from the provided JSON
data = {
    "style_combinations": ["Textured suits with patterned shirts", "Casual blazers with athletic wear", "Vintage formal pieces with modern fits", "Sustainable fabrics in traditional cuts", "Bold colors in conservative silhouettes", "Mixed metal accessories (gold/silver)", "Seasonal fabric mixing (linen/wool)", "Smart casual for diverse body types", "Cultural fusion in Western formalwear", "Tech fabrics in traditional styling"],
    "customer_demand": [7, 8, 6, 9, 7, 6, 8, 9, 7, 8],
    "competitor_coverage": [3, 2, 4, 5, 4, 2, 3, 3, 2, 4],
    "market_opportunity": [8, 9, 6, 9, 7, 7, 8, 10, 8, 8]
}

df = pd.DataFrame(data)

# Calculate the gap between demand and competitor coverage (higher gap = bigger opportunity)
df['demand_gap'] = df['customer_demand'] - df['competitor_coverage']

# For bubble size, invert competitor coverage (lower coverage = larger bubble)
df['bubble_size'] = 11 - df['competitor_coverage']  # Invert scale so lower coverage = larger bubble

# Create shortened labels for display (keeping under 15 characters as per instructions)
df['short_labels'] = [
    "Textured", "Casual", "Vintage", "Sustainable", 
    "Bold Colors", "Mixed Metals", "Seasonal", "Smart Casual", 
    "Cultural", "Tech Fabrics"
]

# Create the scatter plot
fig = go.Figure()

# Add scatter plot with bubble sizes, color coding, and labels
fig.add_trace(go.Scatter(
    x=df['customer_demand'],
    y=df['market_opportunity'],
    mode='markers+text',
    marker=dict(
        size=df['bubble_size'] * 10,  # Scale bubble size for visibility
        color=df['demand_gap'],
        colorscale=[[0, '#DB4545'], [0.5, '#5D878F'], [1, '#1FB8CD']],
        showscale=True,
        colorbar=dict(title="Demand-Coverage"),
        sizemode='diameter',
        line=dict(width=2, color='white'),
        opacity=0.8
    ),
    text=df['short_labels'],
    textposition="middle center",
    textfont=dict(size=10, color='white'),
    hovertemplate='<b>%{text}</b><br>' +
                  'Demand: %{x}<br>' +
                  'Opportunity: %{y}<br>' +
                  'Gap: %{marker.color}<br>' +
                  '<extra></extra>',
    showlegend=False,
    cliponaxis=False
))

# Update layout
fig.update_layout(
    title="Menswear Style Opportunities",
    xaxis_title="Demand Level",
    yaxis_title="Market Opp"
)

# Update axes to show full 1-10 range
fig.update_xaxes(range=[1, 10])
fig.update_yaxes(range=[1, 10])

# Save the chart
fig.write_image("menswear_opportunity_matrix.png")