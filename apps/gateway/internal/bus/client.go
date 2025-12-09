package bus

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type Client struct {
	rdb *redis.Client
}

func NewClient(redisURL string) (*Client, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid redis url: %w", err)
	}

	rdb := redis.NewClient(opts)

	// Ping to verify connection
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return &Client{rdb: rdb}, nil
}

func (c *Client) Close() error {
	return c.rdb.Close()
}

// SubscribeToUserEvents subscribes to a Redis channel specific to a user.
// It returns a Go channel that receives raw message payloads (strings).
func (c *Client) SubscribeToUserEvents(ctx context.Context, userID string) (<-chan string, error) {
	channelName := fmt.Sprintf("user:%s:events", userID)
	pubsub := c.rdb.Subscribe(ctx, channelName)

	// Wait for confirmation that subscription is created
	_, err := pubsub.Receive(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to subscribe to channel %s: %w", channelName, err)
	}

	msgChan := make(chan string)

	// Start a goroutine to pump messages
	go func() {
		defer close(msgChan)
		defer pubsub.Close()

		ch := pubsub.Channel()
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}
				select {
				case msgChan <- msg.Payload:
				case <-ctx.Done():
					return
				}
			}
		}
	}()

	return msgChan, nil
}
