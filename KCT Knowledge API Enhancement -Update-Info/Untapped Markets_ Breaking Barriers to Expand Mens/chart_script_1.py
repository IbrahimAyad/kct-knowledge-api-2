import plotly.express as px
import pandas as pd
import json

# Load the data
data = [
  {"Segment": "Plus-size Men", "Market_Size_Millions": 25, "Current_Penetration_Percent": 15, "Revenue_Opportunity_Billions": 8},
  {"Segment": "Athletic Build Men", "Market_Size_Millions": 15, "Current_Penetration_Percent": 20, "Revenue_Opportunity_Billions": 5},
  {"Segment": "Short Men", "Market_Size_Millions": 12, "Current_Penetration_Percent": 25, "Revenue_Opportunity_Billions": 4},
  {"Segment": "Wheelchair Users", "Market_Size_Millions": 3.6, "Current_Penetration_Percent": 5, "Revenue_Opportunity_Billions": 2},
  {"Segment": "Limited Mobility", "Market_Size_Millions": 8, "Current_Penetration_Percent": 10, "Revenue_Opportunity_Billions": 3},
  {"Segment": "Sensory Disabilities", "Market_Size_Millions": 6, "Current_Penetration_Percent": 2, "Revenue_Opportunity_Billions": 2.5},
  {"Segment": "Young Professionals Avoiding Suits", "Market_Size_Millions": 20, "Current_Penetration_Percent": 30, "Revenue_Opportunity_Billions": 12},
  {"Segment": "Casual-Only Men", "Market_Size_Millions": 35, "Current_Penetration_Percent": 35, "Revenue_Opportunity_Billions": 15}
]

df = pd.DataFrame(data)

# Create abbreviated segment names for display (keeping under 15 chars)
df['Short_Segment'] = [
    'Plus-size', 'Athletic', 'Short Men', 'Wheelchair', 
    'Limited Mob.', 'Sensory Dis.', 'Young Prof.', 'Casual-Only'
]

# Create the bubble chart
fig = px.scatter(df, 
                x='Market_Size_Millions', 
                y='Current_Penetration_Percent',
                size='Revenue_Opportunity_Billions',
                color='Short_Segment',
                hover_name='Short_Segment',
                hover_data={
                    'Market_Size_Millions': ':,.1f',
                    'Current_Penetration_Percent': ':,.0f', 
                    'Revenue_Opportunity_Billions': ':,.1f',
                    'Short_Segment': False
                },
                title='Menswear Market Opportunities',
                size_max=60)

# Update layout and axes
fig.update_layout(
    xaxis_title='Mkt Size (M)',
    yaxis_title='Penetration %',
    legend_title='Segment',
    showlegend=True,
    legend=dict(orientation='v', yanchor='top', y=1, xanchor='left', x=1.02)
)

# Update hover template
fig.update_traces(
    hovertemplate='<b>%{hovertext}</b><br>' +
                  'Market Size: %{x}M people<br>' +
                  'Penetration: %{y}%<br>' +
                  'Revenue Opp: $%{marker.size}B<extra></extra>',
    cliponaxis=False
)

# Save the chart
fig.write_image('menswear_opportunities.png', width=800, height=600, scale=2)