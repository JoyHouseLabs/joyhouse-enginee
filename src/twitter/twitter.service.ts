import { Injectable } from '@nestjs/common';
import { TwitterApi } from 'twitter-api-v2';

@Injectable()
export class TwitterService {
  private client: TwitterApi;

  constructor() {
    this.client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN as string);
  }

  async isFollowing(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const following = await this.client.v2.following(userId, { max_results: 100 });
      return following.data.some(user => user.id === targetUserId);
    } catch (error) {
      console.error('Error checking if user is following:', error);
      return false;
    }
  }

  async hasReplied(userId: string, tweetId: string): Promise<boolean> {
    try {
      // const replies = await this.client.v2.tweetSearch({
      //   query: `conversation_id:${tweetId} from:${userId}`,
      //   max_results: 100,
      // });
      // return replies.data.length > 0;
      return true
    } catch (error) {
      console.error('Error checking if user has replied:', error);
      return false;
    }
  }
} 