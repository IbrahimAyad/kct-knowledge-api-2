import plotly.graph_objects as go
import pandas as pd

# Data for the menswear designers
data = [
    {
        "Designer": "Dapper Dan",
        "Key Elements": "Logomania, Custom Luxury, Street Fusion", 
        "Philosophy": "Democratizing Luxury Through Innovation",
        "Color Palette": "Bold Logos, Rich Leathers, Metallics",
        "Archetype": "The Revolutionary Tailor"
    },
    {
        "Designer": "Tom Ford",
        "Key Elements": "Sharp Tailoring, Sensual Minimalism, Hollywood Glamour",
        "Philosophy": "Modern Masculinity with Seductive Edge", 
        "Color Palette": "Black, Charcoal, Deep Jewel Tones",
        "Archetype": "The Sophisticated Seducer"
    },
    {
        "Designer": "Yves Saint Laurent",
        "Key Elements": "Gender-Fluid Tailoring, Le Smoking, Art-Inspired",
        "Philosophy": "Fashion as Liberation and Art",
        "Color Palette": "Monochrome, Bold Primaries, Neutrals", 
        "Archetype": "The Artistic Liberator"
    },
    {
        "Designer": "Hedi Slimane", 
        "Key Elements": "Skinny Silhouettes, Rock Aesthetic, Youth Culture",
        "Philosophy": "Rebellious Elegance with Street Credibility",
        "Color Palette": "Black, White, Monochrome",
        "Archetype": "The Rock Star Rebel"
    },
    {
        "Designer": "Ralph Lauren",
        "Key Elements": "American Preppy, Polo Heritage, Aspirational Living",
        "Philosophy": "Timeless American Dream Lifestyle", 
        "Color Palette": "Navy, Cream, Heritage Plaids, Earth Tones",
        "Archetype": "The American Aristocrat"
    },
    {
        "Designer": "Giorgio Armani",
        "Key Elements": "Unstructured Tailoring, Fluid Draping, Greige Palette",
        "Philosophy": "Effortless Italian Sophistication",
        "Color Palette": "Greige, Neutral Tones, Soft Textures",
        "Archetype": "The Italian Master"
    }
]

df = pd.DataFrame(data)

# Brand colors
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C', '#B4413C']

# Create hover text with all information
hover_text = []
for i, row in df.iterrows():
    hover_text.append(
        f"<b>{row['Designer']}</b><br>" +
        f"Elements: {row['Key Elements']}<br>" +
        f"Philosophy: {row['Philosophy']}<br>" + 
        f"Colors: {row['Color Palette']}<br>" +
        f"Archetype: {row['Archetype']}"
    )

# Create multiple traces to show different information
fig = go.Figure()

# Main bars showing archetype
fig.add_trace(go.Bar(
    y=df['Designer'],
    x=[4] * len(df),  
    orientation='h',
    marker_color=colors[:len(df)],
    hovertemplate='%{hovertext}<extra></extra>',
    hovertext=hover_text,
    name="",
    showlegend=False
))

# Add key elements as text annotations
for i, (designer, elements, philosophy, palette) in enumerate(zip(df['Designer'], df['Key Elements'], df['Philosophy'], df['Color Palette'])):
    # Abbreviate elements to fit 15 char limit
    elements_short = elements.split(',')[0][:15]
    if len(elements_short) > 12:
        elements_short = elements_short[:12] + '...'
    
    # Add elements text
    fig.add_annotation(
        x=1,
        y=i,
        text=f"<b>{elements_short}</b>",
        showarrow=False,
        font=dict(color='white', size=11),
        xanchor='left',
        yanchor='middle'
    )
    
    # Add philosophy abbreviation
    philosophy_short = philosophy.split()[0][:12]
    fig.add_annotation(
        x=2.5,
        y=i,
        text=philosophy_short,
        showarrow=False,
        font=dict(color='white', size=10),
        xanchor='center',
        yanchor='middle'
    )
    
    # Add color palette abbreviation  
    palette_short = palette.split(',')[0][:12]
    fig.add_annotation(
        x=3.7,
        y=i,
        text=palette_short,
        showarrow=False,
        font=dict(color='white', size=9),
        xanchor='right',
        yanchor='middle'
    )

# Update layout
fig.update_layout(
    title='Menswear Designer Style Elements',
    xaxis_title='',
    yaxis_title='Designer',
    showlegend=False,
    xaxis=dict(showticklabels=False, showgrid=False, range=[0, 4]),
    yaxis=dict(showgrid=False)
)

# Save the chart
fig.write_image('menswear_designers_chart.png', width=900, height=600)