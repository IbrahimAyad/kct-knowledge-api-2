import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

# Create the data for search themes
data = {
    "themes": ["Suit Fit & Sizing", "Wedding Attire Guidelines", "Rental vs Purchase", 
               "Tuxedo vs Suit Differences", "Alterations & Tailoring", "Color Matching & Coordination", 
               "Formal Dress Codes", "Fabric Selection Advice"],
    "search_volume_2024": [162000, 149000, 108000, 97000, 91000, 86000, 79000, 73000],
    "growth_rates": [11.7, 12.9, 14.9, 9.0, 11.0, 10.3, 11.3, 9.0]
}

# Create DataFrame
df = pd.DataFrame(data)

# Abbreviate theme names to 15 characters
df['abbreviated_themes'] = [
    "Suit Fit & Size",
    "Wedding Attire", 
    "Rental vs Purch",
    "Tuxedo vs Suit",
    "Alterations",
    "Color Matching",
    "Formal Codes",
    "Fabric Select"
]

# Convert search volumes to k format for display
df['volume_k'] = df['search_volume_2024'] / 1000

# Sort by search volume (ascending for horizontal bar chart to show highest at top)
df = df.sort_values('search_volume_2024', ascending=True)

# Brand colors
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C', '#B4413C', '#964325', '#944454']

# Create horizontal bar chart
fig = go.Figure()

fig.add_trace(go.Bar(
    y=df['abbreviated_themes'],
    x=df['volume_k'],
    orientation='h',
    marker=dict(
        color=df['growth_rates'],
        colorscale='Viridis',
        colorbar=dict(
            title="Growth Rate %"
        )
    ),
    text=[f"{int(vol)}k" for vol in df['volume_k']],
    textposition='outside',
    hovertemplate='<b>%{y}</b><br>Volume: %{x}k<br>Growth: %{marker.color}%<extra></extra>'
))

# Update layout
fig.update_layout(
    title="Top Search Themes by Volume",
    xaxis_title="Volume (k)",
    yaxis_title="Search Themes",
    showlegend=False
)

# Save the chart
fig.write_image("formal_menswear_search_themes.png")