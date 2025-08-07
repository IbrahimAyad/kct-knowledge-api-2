import plotly.graph_objects as go
import math
import random

# Load the data
data = [
  {"phrase": "Tell me more about", "frequency": 95, "category": "discovery"},
  {"phrase": "Perfect for", "frequency": 90, "category": "validation"},
  {"phrase": "Based on what you've told me", "frequency": 85, "category": "personalization"},
  {"phrase": "Let me show you", "frequency": 92, "category": "presentation"},
  {"phrase": "You look fantastic", "frequency": 88, "category": "encouragement"},
  {"phrase": "This will work perfectly", "frequency": 87, "category": "reassurance"},
  {"phrase": "Great choice", "frequency": 93, "category": "validation"},
  {"phrase": "Now let's talk about", "frequency": 83, "category": "transition"},
  {"phrase": "I can definitely help", "frequency": 89, "category": "support"},
  {"phrase": "Exactly what you need", "frequency": 86, "category": "fit"},
  {"phrase": "Perfect! Now", "frequency": 91, "category": "transition"},
  {"phrase": "That sounds like", "frequency": 78, "category": "understanding"},
  {"phrase": "For your occasion", "frequency": 84, "category": "relevance"},
  {"phrase": "Don't worry about", "frequency": 82, "category": "reassurance"},
  {"phrase": "Trust me on this", "frequency": 79, "category": "confidence"},
  {"phrase": "You're going to love", "frequency": 94, "category": "excitement"},
  {"phrase": "Let's make sure", "frequency": 80, "category": "care"},
  {"phrase": "What I'm thinking", "frequency": 77, "category": "expertise"},
  {"phrase": "Here's what makes this special", "frequency": 81, "category": "value"},
  {"phrase": "This is going to", "frequency": 85, "category": "outcome"},
  {"phrase": "Beautiful selection", "frequency": 76, "category": "compliment"},
  {"phrase": "Excellent choice", "frequency": 89, "category": "validation"},
  {"phrase": "Ready to", "frequency": 75, "category": "action"},
  {"phrase": "Feel free to reach out", "frequency": 73, "category": "support"}
]

# Sort by frequency for better positioning
data.sort(key=lambda x: x['frequency'], reverse=True)

# Create color scheme - use primary brand colors with good contrast
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C']

# Generate non-overlapping positions using a grid-based approach
def generate_grid_positions(n, grid_width=5):
    positions = []
    cols = grid_width
    rows = math.ceil(n / cols)
    
    # Center the grid
    start_x = -(cols - 1) * 1.5 / 2
    start_y = (rows - 1) * 1.0 / 2
    
    for i in range(n):
        row = i // cols
        col = i % cols
        
        # Add some randomness to avoid perfect grid look
        x = start_x + col * 1.5 + random.uniform(-0.2, 0.2)
        y = start_y - row * 1.0 + random.uniform(-0.1, 0.1)
        
        positions.append((x, y))
    
    return positions

# Set random seed for consistent layout
random.seed(42)
positions = generate_grid_positions(len(data), grid_width=6)

# Create the figure
fig = go.Figure()

# Add each phrase as a separate text element
for i, (item, pos) in enumerate(zip(data, positions)):
    # Scale font size based on frequency (14-32 range)
    min_freq = min(d['frequency'] for d in data)
    max_freq = max(d['frequency'] for d in data)
    font_size = 14 + (item['frequency'] - min_freq) * 18 / (max_freq - min_freq)
    
    # Use colors in rotation for visual variety
    color = colors[i % len(colors)]
    
    # Add slight opacity gradient based on frequency for depth
    opacity = 0.7 + (item['frequency'] - min_freq) * 0.3 / (max_freq - min_freq)
    
    fig.add_trace(go.Scatter(
        x=[pos[0]],
        y=[pos[1]],
        mode='text',
        text=[item['phrase']],
        textfont=dict(
            size=font_size, 
            color=color,
            family="Arial Bold"
        ),
        showlegend=False,
        hovertemplate=f"<b>{item['phrase']}</b><br>Freq: {item['frequency']}<br>Cat: {item['category']}<extra></extra>",
        cliponaxis=False
    ))

# Update layout for better presentation
fig.update_layout(
    title="Menswear Conversation Key Phrases",
    xaxis=dict(visible=False, range=[-5, 5]),
    yaxis=dict(visible=False, range=[-3, 3]),
    plot_bgcolor='rgba(0,0,0,0)',
    paper_bgcolor='rgba(0,0,0,0)',
)

# Remove axes completely
fig.update_xaxes(showgrid=False, zeroline=False, visible=False)
fig.update_yaxes(showgrid=False, zeroline=False, visible=False)

# Save the chart with better dimensions
fig.write_image("menswear_phrases_wordcloud.png", width=1200, height=800)