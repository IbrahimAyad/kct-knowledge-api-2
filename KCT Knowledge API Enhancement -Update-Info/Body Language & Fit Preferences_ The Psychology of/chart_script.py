import pandas as pd
import plotly.express as px

# Data with shortened age group names to meet 15 character limit
data = [
  {"age_group": "Young (18-29)", "Slim Fit": 40, "Modern Fit": 35, "Classic Fit": 20, "Relaxed Fit": 5},
  {"age_group": "Prof (30-54)", "Slim Fit": 15, "Modern Fit": 40, "Classic Fit": 35, "Relaxed Fit": 10},
  {"age_group": "Mature Men (55+)", "Slim Fit": 5, "Modern Fit": 20, "Classic Fit": 45, "Relaxed Fit": 30}
]

df = pd.DataFrame(data)

# Melt the dataframe for plotly express
df_melted = df.melt(id_vars=['age_group'], var_name='fit_type', value_name='percentage')

# Create horizontal bar chart
fig = px.bar(df_melted, 
             x='percentage', 
             y='age_group', 
             color='fit_type',
             orientation='h',
             title='Suit Fit Preferences by Age Group',
             color_discrete_sequence=['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F'])

# Update layout for legend positioning (4 items, so center under title)
fig.update_layout(legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5))

# Add percentage labels and formatting
fig.update_traces(cliponaxis=False, texttemplate='%{x}%', textposition='auto')
fig.update_xaxes(title='Percentage')
fig.update_yaxes(title='Age Group')

fig.write_image('suit_fit_preferences.png')