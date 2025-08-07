import plotly.graph_objects as go
import pandas as pd

# Create the data
data = [
    {"Weather_Pattern": "Unexpected Cold Snap", "Purchase_Spike_Percentage": 85, "Lead_Time_Days": 3},
    {"Weather_Pattern": "Unseasonable Warm Spell", "Purchase_Spike_Percentage": 120, "Lead_Time_Days": 5},
    {"Weather_Pattern": "Extended Rainy Period", "Purchase_Spike_Percentage": 65, "Lead_Time_Days": 7},
    {"Weather_Pattern": "Early Heat Wave", "Purchase_Spike_Percentage": 95, "Lead_Time_Days": 2},
    {"Weather_Pattern": "Late Season Chill", "Purchase_Spike_Percentage": 70, "Lead_Time_Days": 4},
    {"Weather_Pattern": "Drought Conditions", "Purchase_Spike_Percentage": 45, "Lead_Time_Days": 14},
    {"Weather_Pattern": "Sudden Storm Systems", "Purchase_Spike_Percentage": 55, "Lead_Time_Days": 1},
    {"Weather_Pattern": "Temperature Fluctuations", "Purchase_Spike_Percentage": 80, "Lead_Time_Days": 2}
]

df = pd.DataFrame(data)

# Better abbreviations for weather patterns (15 char limit)
weather_abbrev = {
    "Unexpected Cold Snap": "Unexp Cold",
    "Unseasonable Warm Spell": "Unseas Warm", 
    "Extended Rainy Period": "Extend Rain",
    "Early Heat Wave": "Early Heat",
    "Late Season Chill": "Late Chill",
    "Drought Conditions": "Drought",
    "Sudden Storm Systems": "Sudden Storm",
    "Temperature Fluctuations": "Temp Fluct"
}

df['Weather_Abbrev'] = df['Weather_Pattern'].map(weather_abbrev)

# Scale Lead Time Days to be more visible (multiply by 10 for better visibility)
df['Lead_Time_Scaled'] = df['Lead_Time_Days'] * 10

# Create the line chart with both metrics
fig = go.Figure()

# Add Purchase Spike Percentage line
fig.add_trace(go.Scatter(
    x=df['Weather_Abbrev'],
    y=df['Purchase_Spike_Percentage'],
    mode='lines+markers',
    name='Purchase Spike %',
    line=dict(color='#1FB8CD', width=3),
    marker=dict(size=8, color='#1FB8CD'),
    hovertemplate='<b>%{x}</b><br>Purchase Spike: %{y}%<extra></extra>',
    cliponaxis=False
))

# Add Lead Time Days line (scaled by 10)
fig.add_trace(go.Scatter(
    x=df['Weather_Abbrev'],
    y=df['Lead_Time_Scaled'],
    mode='lines+markers',
    name='Lead Time (x10)',
    line=dict(color='#DB4545', width=3),
    marker=dict(size=8, color='#DB4545'),
    hovertemplate='<b>%{x}</b><br>Lead Time: %{customdata} days<extra></extra>',
    customdata=df['Lead_Time_Days'],
    cliponaxis=False
))

fig.update_layout(
    title='Weather Impact on Menswear Purchases',
    xaxis_title='Weather Pattern',
    yaxis_title='Spike % / Days*10',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

fig.update_xaxes(tickangle=45)
fig.update_yaxes(range=[0, max(max(df['Purchase_Spike_Percentage']), max(df['Lead_Time_Scaled'])) * 1.1])

# Save the chart
fig.write_image("weather_menswear_impact.png")