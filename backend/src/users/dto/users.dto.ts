import { IsEthereumAddress, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}

export class LinkWalletDto {
  @IsString()
  @IsEthereumAddress()
  walletAddress: string;

  @IsString()
  signature: string;
}
