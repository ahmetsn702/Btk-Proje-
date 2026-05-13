import { Global, Module } from '@nestjs/common';
import { Dev2ApiService } from './dev2-api.service';

@Global()
@Module({
  providers: [Dev2ApiService],
  exports: [Dev2ApiService],
})
export class SharedModule {}
