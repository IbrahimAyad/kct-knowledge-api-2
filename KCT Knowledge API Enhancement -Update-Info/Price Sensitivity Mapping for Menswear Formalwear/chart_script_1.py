import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Create the data
data = {
    "bundle_types": ["Mix-and-Match Flexibility", "Complementary Accessories", "Seasonal/Event Bundles", "Premium Experience Bundles", "Clearance/Inventory Bundles"],
    "revenue_impact": ["High Positive", "Moderate Positive", "High Positive", "Moderate Positive", "Mixed"],
    "cannibalization_risk": ["Low", "Low", "Low", "Moderate", "High"],
    "best_price_range": ["$200-500", "$200-1000", "$200-500", "$500-2000", "$100-350"]
}

df = pd.DataFrame(data)

# Convert revenue impact to numerical values for visualization
revenue_mapping = {"High Positive": 3, "Moderate Positive": 2, "Mixed": 1}
df['revenue_score'] = df['revenue_impact'].map(revenue_mapping)

# Define colors for cannibalization risk
color_mapping = {
    "Low": "#1FB8CD",     # Strong cyan
    "Moderate": "#2E8B57", # Sea green  
    "High": "#DB4545"      # Bright red
}

# Abbreviate bundle type names to fit 15 character limit
df['short_names'] = [
    "Mix-Match Flex",
    "Comp Access", 
    "Season/Event",
    "Premium Exp",
    "Clear/Inventory"
]

# Create horizontal bar chart
fig = go.Figure()

for risk_level in ["Low", "Moderate", "High"]:
    mask = df['cannibalization_risk'] == risk_level
    if mask.any():
        fig.add_trace(go.Bar(
            y=df[mask]['short_names'],
            x=df[mask]['revenue_score'],
            name=f"{risk_level} Risk",
            marker_color=color_mapping[risk_level],
            orientation='h',
            hovertemplate='<b>%{y}</b><br>Revenue: %{customdata}<br>Risk: ' + risk_level + '<extra></extra>',
            customdata=df[mask]['revenue_impact']
        ))

# Update layout
fig.update_layout(
    title="Bundle Revenue Impact by Risk Level",
    xaxis_title="Revenue Impact",
    yaxis_title="Bundle Types",
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Update x-axis with custom tick labels
fig.update_xaxes(
    tickvals=[1, 2, 3],
    ticktext=["Mixed", "Mod Positive", "High Positive"]
)

# Save the chart
fig.write_image("bundle_strategy_analysis.png")