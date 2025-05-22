import os
import boto3
from botocore.config import Config
from dotenv import load_dotenv
from typing import BinaryIO, Optional
import uuid

load_dotenv()

class R2Storage:
    def __init__(self):
        self.bucket_name = os.getenv('R2_BUCKET_NAME')
        
        self.s3 = boto3.client(
            's3',
            endpoint_url=os.getenv('R2_ENDPOINT_URL'),
            aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
            config=Config(signature_version='s3v4'),
        )

    def upload_file(self, file: BinaryIO, original_filename: str) -> str:
        """
        Upload a file to R2 storage
        Returns the unique file identifier
        """
        file_id = str(uuid.uuid4())
        extension = original_filename.split('.')[-1]
        key = f"{file_id}.{extension}"
        
        self.s3.upload_fileobj(file, self.bucket_name, key)
        return key

    def upload_cleaned_version(self, file: BinaryIO, original_file_key: str) -> str:
        """
        Upload a cleaned version of a file to R2 storage
        Returns the file key for the cleaned version
        """
        # Extract the original file ID and extension
        original_id = original_file_key.split('.')[0]
        extension = original_file_key.split('.')[-1]
        
        # Create a new key with 'cleaned_' prefix
        cleaned_key = f"cleaned_{original_id}.{extension}"
        
        # Upload the cleaned file
        self.s3.upload_fileobj(file, self.bucket_name, cleaned_key)
        return cleaned_key

    def download_file(self, file_key: str) -> Optional[BinaryIO]:
        """
        Download a file from R2 storage
        Returns the file object or None if not found
        """
        try:
            response = self.s3.get_object(Bucket=self.bucket_name, Key=file_key)
            return response['Body']
        except self.s3.exceptions.NoSuchKey:
            return None

    def delete_file(self, file_key: str) -> bool:
        """
        Delete a file from R2 storage
        Returns True if successful, False otherwise
        """
        try:
            self.s3.delete_object(Bucket=self.bucket_name, Key=file_key)
            return True
        except:
            return False

    def get_file_url(self, file_key: str, expires_in: int = 3600) -> str:
        """
        Generate a presigned URL for file download
        expires_in: URL expiration time in seconds (default 1 hour)
        """
        url = self.s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': file_key},
            ExpiresIn=expires_in
        )
        return url 