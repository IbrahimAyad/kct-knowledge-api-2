import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import json

# Load the data
data = [
  {
    "Age_Range": "22-27",
    "Base_Wardrobe": 900,
    "Tailoring_Services": 225,
    "Accessories": 150,
    "Shoes": 150,
    "Grooming_Maintenance": 75
  },
  {
    "Age_Range": "28-32", 
    "Base_Wardrobe": 1800,
    "Tailoring_Services": 450,
    "Accessories": 300,
    "Shoes": 300,
    "Grooming_Maintenance": 150
  },
  {
    "Age_Range": "33-37",
    "Base_Wardrobe": 3000,
    "Tailoring_Services": 750,
    "Accessories": 500,
    "Shoes": 500,
    "Grooming_Maintenance": 250
  },
  {
    "Age_Range": "38-42",
    "Base_Wardrobe": 4800,
    "Tailoring_Services": 1200,
    "Accessories": 800,
    "Shoes": 800,
    "Grooming_Maintenance": 400
  },
  {
    "Age_Range": "43-47",
    "Base_Wardrobe": 7200,
    "Tailoring_Services": 1800,
    "Accessories": 1200,
    "Shoes": 1200,
    "Grooming_Maintenance": 600
  },
  {
    "Age_Range": "48-52",
    "Base_Wardrobe": 9600,
    "Tailoring_Services": 2400,
    "Accessories": 1600,
    "Shoes": 1600,
    "Grooming_Maintenance": 800
  },
  {
    "Age_Range": "53-57",
    "Base_Wardrobe": 11880,
    "Tailoring_Services": 2970,
    "Accessories": 1980,
    "Shoes": 1980,
    "Grooming_Maintenance": 990
  },
  {
    "Age_Range": "58+",
    "Base_Wardrobe": 14400,
    "Tailoring_Services": 3600,
    "Accessories": 2400,
    "Shoes": 2400,
    "Grooming_Maintenance": 1200
  }
]

df = pd.DataFrame(data)

# Define brand colors
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C']

# Create stacked area chart
fig = go.Figure()

# Add traces for each category
categories = ['Base_Wardrobe', 'Tailoring_Services', 'Accessories', 'Shoes', 'Grooming_Maintenance']
category_names = ['Base Wardrobe', 'Tailoring Svc', 'Accessories', 'Shoes', 'Grooming/Maint']

for i, (category, name) in enumerate(zip(categories, category_names)):
    fig.add_trace(go.Scatter(
        x=df['Age_Range'],
        y=df[category],
        mode='lines',
        fill='tonexty' if i > 0 else 'tozeroy',
        name=name,
        line=dict(color=colors[i]),
        fillcolor=colors[i],
        stackgroup='one',
        cliponaxis=False,
        hovertemplate=f'<b>{name}</b><br>Age: %{{x}}<br>Investment: $%{{y:,.0f}}<extra></extra>'
    ))

# Update layout
fig.update_layout(
    title='Wardrobe Investment by Age Range',
    xaxis_title='Age Range',
    yaxis_title='Investment ($)',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Format y-axis to show values in thousands
fig.update_yaxes(tickformat='$,.0f')
fig.update_xaxes()

# Save the chart
fig.write_image('wardrobe_investment_chart.png')